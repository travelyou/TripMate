/* eslint-env node */
/* global require, process, module */
const { Pool } = require('pg');
require('dotenv').config();
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);

dns.setDefaultResultOrder('ipv4first');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNestedErrorCodes(err) {
  const codes = new Set();
  if (err?.code) codes.add(err.code);
  if (Array.isArray(err?.errors)) {
    for (const e of err.errors) {
      if (e?.code) codes.add(e.code);
    }
  }
  return [...codes];
}

function shouldRetryConnectionError(err) {
  const codes = getNestedErrorCodes(err);
  return codes.some((c) =>
    [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'EAI_AGAIN',
      'ENOTFOUND',
    ].includes(c),
  );
}

function checkEnvVars() {
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.error('缺少環境變數：', missingEnvVars.join(', '));
    console.error('請確認 backend/.env 文件存在且包含所有必要的配置。');
    return false;
  }
  return true;
}

async function createPool() {
  if (!checkEnvVars()) {
    throw new Error('缺少必要的環境變數');
  }

  console.log('資料庫連接配置：');
  console.log('  DB_HOST:', process.env.DB_HOST);
  console.log('  DB_PORT:', process.env.DB_PORT);
  console.log('  DB_NAME:', process.env.DB_NAME);
  console.log('  DB_USER:', process.env.DB_USER);
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '已設置' : '未設置');
  console.log('  連接池模式:', process.env.USE_POOLING === 'true' || process.env.USE_POOLING === '1' ? '啟用' : '停用');

  if (process.env.DB_HOST && (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))) {
    console.error('警告：DB_HOST 包含端口或路徑，這是不正確的！');
  }

  const useConnectionPooling = process.env.USE_POOLING === 'true' || process.env.USE_POOLING === '1';
  const dbHost = process.env.DB_HOST;

  // 檢測 Neon 連接池（主機名包含 -pooler）
  const isNeonPooler = typeof dbHost === 'string' && dbHost.includes('-pooler');

  if (isNeonPooler) {
    console.log('✅ 檢測到 Neon 連接池端點（Connection Pooling）');
  }

  // 一律只用 IPv4：若 DB_HOST 包含 ':'，很可能不是 IPv4 位址/主機名格式
  if (typeof dbHost === 'string' && dbHost.includes(':')) {
    throw new Error('DB_HOST 格式不支援（包含 ":"）。此專案已設定為僅使用 IPv4，請改用 IPv4 的 DB_HOST（例如 IPv4 位址或可解析出 A 記錄的主機名）。');
  }

  // 一律只允許 IPv4：必須存在 A 記錄；但連線仍使用「原始 hostname」以保留 TLS SNI（Neon 需要）
  try {
    const addrs4 = await dnsResolve4(dbHost);
    if (!addrs4?.length) throw new Error('查無 IPv4 A 記錄');
    console.log(`DNS A 記錄可用（IPv4）：${addrs4[0]}`);
  } catch (e) {
    // 有些環境 dns.resolve4 可能受限，改用 dns.lookup 強制 IPv4 再確認一次
    try {
      const lookedUp = await dnsLookup(dbHost, { family: 4 });
      console.log(`DNS lookup 可用（IPv4）：${lookedUp.address}`);
    } catch (e2) {
      const msg = e?.message || e2?.message || '未知 DNS 錯誤';
      throw new Error(`僅 IPv4 模式下 DNS 解析失敗：${msg}（請確認 DB_HOST 有 IPv4 A 記錄）`);
    }
  }
  const poolConfig = {
    // 保留 hostname，避免 SSL SNI 因為使用 IP 而失效（Neon 會回 Endpoint ID is not specified）
    host: dbHost,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Neon 有時會 cold start；在某些平台上 TCP 連線也可能較慢，保守拉長一點
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS) || 60000,
    idleTimeoutMillis: 30000,
    // 避免瞬間開太多連線（Neon/平台可能會抖或限流），預設保守一點
    max: parseInt(process.env.DB_POOL_MAX) || 3,
    // 在某些平台上保持 TCP 活性可降低長連線被中間設備回收後的突發 timeout
    keepAlive: true,
    keepAliveInitialDelayMillis: parseInt(process.env.DB_KEEPALIVE_DELAY_MS) || 10000,
  };

  // 強制 pg 只用 IPv4
  poolConfig.family = 4;
  // 額外保險：讓 pg 內部的 dns.lookup 也只回 IPv4（避免 Node 的 Happy Eyeballs 嘗試 IPv6）
  poolConfig.lookup = (hostname, options, callback) => {
    // node:net 會傳入 options，這裡強制 family=4
    return dns.lookup(hostname, { ...(options || {}), family: 4 }, callback);
  };

  // Neon 相容性：若執行環境因任何原因拿不到 TLS SNI，Neon 會要求帶 endpoint id
  // Neon 文件建議：?options=endpoint%3D<endpoint-id>
  // 在 node-postgres 可用 poolConfig.options = `endpoint=<endpoint-id>`
  // Neon 錯誤訊息定義：endpoint id = 網域名稱的第一段（原樣，不做裁切）
  if (!poolConfig.options && typeof dbHost === 'string' && dbHost.endsWith('.neon.tech')) {
    const firstLabel = dbHost.split('.')[0] || '';
    const endpointId = firstLabel;
    if (endpointId) {
      poolConfig.options = `endpoint=${endpointId}`;
      console.log(`Neon: 已自動注入 endpoint options（endpoint=${endpointId}）以確保相容性`);
    }
  }

  // Supabase 通常需要 SSL。若你的環境不需要，可在 .env 設定 DB_SSL=false 關閉。
  // （pg 的 ssl=true 需用物件形式，否則會因憑證驗證失敗）
  const dbSslRaw = (process.env.DB_SSL ?? 'true').toString().toLowerCase();
  const useSsl = dbSslRaw !== 'false' && dbSslRaw !== '0' && dbSslRaw !== 'no';
  if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false, servername: dbHost };
  }

  // Neon 連接池處理（主機名包含 -pooler）
  if (isNeonPooler) {
    console.log('✅ 使用 Neon 連接池模式');
    // Neon 連接池使用標準端口 5432，不需要特殊用戶名格式
    // 連接池會自動處理連接管理
  }

  // Supabase 連接池處理（端口 6543）
  if (useConnectionPooling && process.env.DB_PORT === '6543') {
    console.log('✅ 使用 Supabase 連接池模式');
    // Supabase Pooler 常要求 user 格式為 postgres.<projectRef>
    // 若你使用 pooler host（如 *.pooler.supabase.com），無法從 DB_HOST 推出 projectRef，
    // 可在 .env 設定 SUPABASE_PROJECT_REF=<你的 project ref> 讓系統自動補齊 user。
    const userFromEnv = process.env.DB_USER;
    const needsProjectUser = userFromEnv && !userFromEnv.includes('.');
    const projectRefFromEnv = process.env.SUPABASE_PROJECT_REF;
    const projectRefFromHostMatch = (process.env.DB_HOST || '').match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1];
    const projectRef = projectRefFromEnv || projectRefFromHostMatch;

    if (needsProjectUser && projectRef) {
      poolConfig.user = `postgres.${projectRef}`;
      console.log('使用 Connection Pooling，用戶名已調整為：', poolConfig.user);
    }
  }

  const pool = new Pool(poolConfig);

  pool.on('connect', () => {
    console.log('資料庫連接成功！');
  });

  pool.on('error', (err) => {
    console.error('資料庫連接失敗：', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('無法解析資料庫主機名，請檢查 DB_HOST 是否正確');
    }
  });

  return pool;
}

let poolInstance = null;
let initPromise = null;
let initError = null;

async function initializePool() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const maxAttempts = parseInt(process.env.DB_CONNECT_MAX_ATTEMPTS) || 6;
    const baseDelayMs = parseInt(process.env.DB_CONNECT_RETRY_BASE_DELAY_MS) || 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let pool = null;
      try {
        pool = await createPool();
        // 強制建立連線並驗證（避免啟動後第一個 query 才爆）
        await pool.query('SELECT 1');

        poolInstance = pool;
        console.log('資料庫連接池已初始化（且已驗證可查詢）');
        return pool;
      } catch (error) {
        initError = error;
        const codes = getNestedErrorCodes(error);
        // 注意：某些錯誤的 message 可能為空，務必印出完整物件與常見欄位，便於 Zeabur/CI 排查
        console.error(
          `資料庫連接池初始化失敗（第 ${attempt}/${maxAttempts} 次）：`,
          error?.message || '(no message)',
        );
        console.error('資料庫連接池初始化失敗（完整錯誤物件）：', error);
        console.error(
          '資料庫錯誤欄位：',
          JSON.stringify(
            {
              name: error?.name,
              code: error?.code,
              nestedCodes: codes,
              errno: error?.errno,
              syscall: error?.syscall,
              address: error?.address,
              port: error?.port,
              severity: error?.severity,
              detail: error?.detail,
              hint: error?.hint,
              routine: error?.routine,
              where: error?.where,
            },
            null,
            2,
          ),
        );
        if (error?.stack) console.error('stack:', error.stack);

        // 失敗時把 pool 關掉，避免殘留 socket
        try {
          if (pool) await pool.end();
        } catch {
          // ignore
        }

        const retryable = shouldRetryConnectionError(error);
        if (!retryable || attempt === maxAttempts) {
          throw error;
        }

        const delay = Math.min(15000, baseDelayMs * attempt);
        console.log(`資料庫連線失敗可重試，${delay}ms 後重試...`);
        await sleep(delay);
      }
    }

    // 理論上不會走到這裡
    throw initError || new Error('資料庫連接池初始化失敗（未知原因）');
  })();

  return initPromise;
}

module.exports = new Proxy({}, {
  get(target, prop) {
    if (poolInstance) {
      const value = poolInstance[prop];
      return typeof value === 'function'
        ? value.bind(poolInstance)
        : value;
    }

    if (initError) {
      throw new Error(`資料庫連接池初始化失敗：${initError.message}`);
    }

    const asyncMethods = ['query', 'connect', 'end'];
    if (asyncMethods.includes(prop)) {
      return async function(...args) {
        await initializePool();
        const method = poolInstance[prop];
        if (typeof method !== 'function') return method;

        // 針對查詢：遇到可重試的連線錯誤（例如 Neon cold start / 網路抖動）做有限次重試
        if (prop === 'query') {
          const maxAttempts = parseInt(process.env.DB_QUERY_MAX_ATTEMPTS) || 3;
          const baseDelayMs = parseInt(process.env.DB_QUERY_RETRY_BASE_DELAY_MS) || 500;

          let lastErr;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              return await method.apply(poolInstance, args);
            } catch (e) {
              lastErr = e;
              const retryable = shouldRetryConnectionError(e);
              if (!retryable || attempt === maxAttempts) throw e;

              const delay = Math.min(3000, baseDelayMs * attempt);
              console.warn(
                `[DB] query 失敗可重試（第 ${attempt}/${maxAttempts} 次，codes=${getNestedErrorCodes(e).join(',') || 'n/a'}），${delay}ms 後重試...`,
              );
              await sleep(delay);
            }
          }
          throw lastErr;
        }

        return method.apply(poolInstance, args);
      };
    }

    throw new Error('資料庫連接池尚未初始化，請稍後再試或檢查環境變數');
  }
});
