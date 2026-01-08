/* eslint-env node */
/* global require, process, module */
const { Pool } = require('pg');
require('dotenv').config();
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

dns.setDefaultResultOrder('ipv4first');

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

async function createPool(options = {}) {
  if (!checkEnvVars()) {
    throw new Error('缺少必要的環境變數');
  }

  console.log('資料庫連接配置：');
  console.log('  DB_HOST:', process.env.DB_HOST);
  console.log('  DB_PORT:', process.env.DB_PORT);
  console.log('  DB_NAME:', process.env.DB_NAME);
  console.log('  DB_USER:', process.env.DB_USER);
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '已設置' : '未設置');

  if (process.env.DB_HOST && (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))) {
    console.error('警告：DB_HOST 包含端口或路徑，這是不正確的！');
  }

  const useConnectionPooling = process.env.USE_POOLING === 'true';

  let dbHost = process.env.DB_HOST;
  let resolvedFamily = null;

  const forcedFamilyFromEnv = parseInt(process.env.DB_FAMILY, 10);
  const forcedFamily = Number.isInteger(options.forceFamily) ? options.forceFamily : forcedFamilyFromEnv;
  const tryIPv4First = forcedFamily !== 6; // 預設優先 IPv4（避免 IPv6 ENETUNREACH）

  // 注意：dns.lookup 在某些 Windows/網路環境會偏向走系統解析，可能拿不到 A 記錄；
  // 這裡改用 dns.resolve4/resolve6 直接查 DNS 記錄，較穩定可控。
  const resolveToIp = async (family) => {
    if (family === 4) {
      const addrs4 = await dnsResolve4(process.env.DB_HOST);
      if (!addrs4?.length) throw new Error('查無 IPv4 A 記錄');
      return { ip: addrs4[0], family: 4 };
    }
    if (family === 6) {
      const addrs6 = await dnsResolve6(process.env.DB_HOST);
      if (!addrs6?.length) throw new Error('查無 IPv6 AAAA 記錄');
      return { ip: addrs6[0], family: 6 };
    }
    throw new Error('不支援的 family');
  };

  // 若有強制 family，就只嘗試該族；否則 IPv4 -> IPv6 fallback
  const familiesToTry = forcedFamily === 4 ? [4] : forcedFamily === 6 ? [6] : (tryIPv4First ? [4, 6] : [6, 4]);
  for (const fam of familiesToTry) {
    try {
      const resolved = await resolveToIp(fam);
      dbHost = resolved.ip;
      resolvedFamily = resolved.family;
      console.log(`DNS 解析成功，使用 IPv${resolvedFamily} 地址: ${dbHost}`);
      break;
    } catch (e) {
      console.warn(`IPv${fam} DNS 解析失敗：`, e.message);
    }
  }

  if (!resolvedFamily) {
    // 最後手段：不改 host，交給系統 resolver（但可能會選到 IPv6）
    try {
      const lookedUp = await dnsLookup(process.env.DB_HOST);
      dbHost = lookedUp.address;
      resolvedFamily = lookedUp.family;
      console.log(`DNS lookup 成功，使用 IPv${resolvedFamily} 地址: ${dbHost}`);
    } catch (e) {
      console.warn('DNS 解析失敗，使用原始主機名:', e.message);
    }
  }
  const poolConfig = {
    host: dbHost,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
  };

  if (resolvedFamily) {
    poolConfig.family = resolvedFamily;
  }

  if (useConnectionPooling && process.env.DB_PORT === '6543') {
    const projectRef = process.env.DB_HOST?.replace('db.', '').replace('.supabase.co', '');
    if (projectRef && !process.env.DB_USER?.includes('.')) {
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
    } else if (err.code === 'ENETUNREACH') {
      console.error('網路不可達，可能是 IPv6 連接問題');
      console.error('請確認網路環境支援 IPv6 連接');
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
    try {
      let pool = await createPool();
      try {
        // 強制建立連線並驗證（避免啟動後第一個 query 才爆）
        await pool.query('SELECT 1');
      } catch (err) {
        // 常見：Windows/部分網路環境 IPv6 可解析但不可達，會噴 ENETUNREACH
        if (err?.code === 'ENETUNREACH' && !process.env.DB_FAMILY) {
          console.warn('偵測到 IPv6 網路不可達（ENETUNREACH），自動改用 IPv4 重試一次。你也可在 .env 設定 DB_FAMILY=4 來固定使用 IPv4。');
          try {
            await pool.end().catch(() => undefined);
          } catch {
            // ignore
          }
          pool = await createPool({ forceFamily: 4 });
          await pool.query('SELECT 1');
        } else {
          throw err;
        }
      }

      poolInstance = pool;
      console.log('資料庫連接池已初始化（且已驗證可查詢）');
      return pool;
    } catch (error) {
      initError = error;
      console.error('資料庫連接池初始化失敗：', error.message);
      throw error;
    }
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
        return typeof method === 'function'
          ? method.apply(poolInstance, args)
          : method;
      };
    }

    throw new Error('資料庫連接池尚未初始化，請稍後再試或檢查環境變數');
  }
});
