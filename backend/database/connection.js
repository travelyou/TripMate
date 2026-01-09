/* eslint-env node */
/* global require, process, module */
const { Pool } = require('pg');
require('dotenv').config();
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);
const dnsResolve4 = promisify(dns.resolve4);

dns.setDefaultResultOrder('ipv4first');

function checkEnvVars() {
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingEnvVars.length > 0) {
    console.error('缺少環境變數：', missingEnvVars.join(', '))
    console.error('請確認 backend/.env 文件存在且包含所有必要的配置。')
    return false
  }
  return true
}

async function createPool() {
  if (!checkEnvVars()) {
    throw new Error('缺少必要的環境變數')
  }

  console.log('資料庫連接配置：')
  console.log('  DB_HOST:', process.env.DB_HOST)
  console.log('  DB_PORT:', process.env.DB_PORT)
  console.log('  DB_NAME:', process.env.DB_NAME)
  console.log('  DB_USER:', process.env.DB_USER)
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '已設置' : '未設置')

  if (
    process.env.DB_HOST &&
    (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))
  ) {
    console.error('警告：DB_HOST 包含端口或路徑，這是不正確的！')
  }

  const useConnectionPooling = process.env.USE_POOLING === 'true'

  const dbHost = process.env.DB_HOST;

  // 一律只用 IPv4：若 DB_HOST 包含 ':'，很可能不是 IPv4 位址/主機名格式
  if (typeof dbHost === 'string' && dbHost.includes(':')) {
    throw new Error('DB_HOST 格式不支援（包含 ":"）。此專案已設定為僅使用 IPv4，請改用 IPv4 的 DB_HOST（例如 IPv4 位址或可解析出 A 記錄的主機名）。');
  }

  // 注意：dns.lookup 在某些 Windows/網路環境會偏向走系統解析，可能拿不到 A 記錄；
  // 這裡優先用 dns.resolve4 直接查 A 記錄，較穩定可控。
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
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
  }

  // 強制 pg 只用 IPv4
  poolConfig.family = 4;

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

  if (useConnectionPooling && process.env.DB_PORT === '6543') {
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

  const pool = new Pool(poolConfig)

  pool.on('connect', () => {
    console.log('資料庫連接成功！')
  })

  pool.on('error', (err) => {
    console.error('資料庫連接失敗：', err.message)
    if (err.code === 'ENOTFOUND') {
      console.error('無法解析資料庫主機名，請檢查 DB_HOST 是否正確');
    }
  })

  return pool
}

let poolInstance = null
let initPromise = null
let initError = null

async function initializePool() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      let pool = await createPool();
      // 強制建立連線並驗證（避免啟動後第一個 query 才爆）
      await pool.query('SELECT 1');

      poolInstance = pool;
      console.log('資料庫連接池已初始化（且已驗證可查詢）');
      return pool;
    } catch (error) {
      initError = error;
      console.error('資料庫連接池初始化失敗：', error.message);
      throw error;
    }
  })();

      return pool
    })
    .catch((error) => {
      initError = error
      console.error('資料庫連接池初始化失敗：', error.message)
      throw error
    })

  return initPromise
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
        throw new Error(`資料庫連接池初始化失敗：${initError.message}`)
      }

      const asyncMethods = ['query', 'connect', 'end']
      if (asyncMethods.includes(prop)) {
        return async function (...args) {
          await initializePool()
          const method = poolInstance[prop]
          return typeof method === 'function' ? method.apply(poolInstance, args) : method
        }
      }

      throw new Error('資料庫連接池尚未初始化，請稍後再試或檢查環境變數')
    },
  },
)
