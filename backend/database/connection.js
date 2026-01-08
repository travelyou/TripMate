/* eslint-env node */
/* global require, process, module */
const { Pool } = require('pg');
require('dotenv').config();
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

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

  if (process.env.DB_HOST && (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))) {
    console.error('警告：DB_HOST 包含端口或路徑，這是不正確的！');
  }

  const useConnectionPooling = process.env.USE_POOLING === 'true';

  let dbHost = process.env.DB_HOST;
  let resolvedFamily = null;
  try {
    // 先試 IPv4
    const address4 = await dnsLookup(process.env.DB_HOST, { family: 4 });
    dbHost = address4.address;
    resolvedFamily = 4;
    console.log(`DNS 解析成功，使用 IPv4 地址: ${dbHost}`);
  } catch (e4) {
    console.warn('IPv4 DNS 解析失敗，嘗試 IPv6：', e4.message);
    try {
      const address6 = await dnsLookup(process.env.DB_HOST, { family: 6 });
      dbHost = address6.address;
      resolvedFamily = 6;
      console.log(`DNS 解析成功，使用 IPv6 地址: ${dbHost}`);
    } catch (e6) {
      console.warn('DNS 解析失敗，使用原始主機名:', e6.message);
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
      const pool = await createPool();
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
