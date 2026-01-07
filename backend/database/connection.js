const { Pool } = require('pg');
require('dotenv').config();
const dns = require('dns');

// 強制使用 IPv4
dns.setDefaultResultOrder('ipv4first');

// 延遲檢查環境變數（不在模組加載時檢查）
function checkEnvVars() {
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.error('缺少環境變數：', missingEnvVars.join(', '));
    console.error('請確認 backend/.env 文件存在且包含所有必要的配置。');
    console.error('或者確保 GitHub Pages 配置已正確部署。');
    return false;
  }
  return true;
}

// 創建連接池的函數（延遲執行）
function createPool() {
  if (!checkEnvVars()) {
    throw new Error('缺少必要的環境變數');
  }

  // 調試：顯示連接配置（隱藏密碼）
  console.log('📋 資料庫連接配置：');
  console.log('  DB_HOST:', process.env.DB_HOST);
  console.log('  DB_PORT:', process.env.DB_PORT);
  console.log('  DB_NAME:', process.env.DB_NAME);
  console.log('  DB_USER:', process.env.DB_USER);
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '已設置' : '未設置');

  // 檢查 DB_HOST 是否包含不應該有的內容
  if (process.env.DB_HOST && (process.env.DB_HOST.includes(':') || process.env.DB_HOST.includes('/'))) {
    console.error('警告：DB_HOST 包含端口或路徑，這是不正確的！');
    console.error('DB_HOST 應該只包含主機名，例如：db.lxoghtipisvzsnprlxrb.supabase.co');
    console.error('端口應該在 DB_PORT 中，路徑應該在 DB_NAME 中');
  }

  const useConnectionPooling = process.env.USE_POOLING === 'true' || false;

  const poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
    // 強制使用 IPv4
    family: 4, // 4 = IPv4, 6 = IPv6
  };

  // 如果使用 Connection Pooling，調整用戶名
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
      console.error('無法解析資料庫主機名，請檢查：');
      console.error('1. DB_HOST 是否正確：', process.env.DB_HOST);
      console.error('2. 網路連接是否正常');
      console.error('3. 是否可以訪問 Supabase');
    } else if (err.code === 'ENETUNREACH') {
      console.error('網路不可達，可能是 IPv6 連接問題');
      console.error('已強制使用 IPv4，請確認網路配置正確');
    }
  });

  return pool;
}

// 延遲初始化：使用 getter 實現
let poolInstance = null;

module.exports = new Proxy({}, {
  get(target, prop) {
    if (!poolInstance) {
      poolInstance = createPool();
    }
    return typeof poolInstance[prop] === 'function'
      ? poolInstance[prop].bind(poolInstance)
      : poolInstance[prop];
  }
});
