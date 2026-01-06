const { Pool } = require('pg');
// 確保環境變數已加載（如果 server.js 還沒加載的話）
require('dotenv').config();

// 檢查必要的環境變數
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('缺少環境變數：', missingEnvVars.join(', '));
  console.error('請確認 backend/.env 文件存在且包含所有必要的配置。');
  console.error('參考 backend/.env.example 文件來創建 .env 文件。');
  process.exit(1);
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

// 嘗試使用 Connection Pooling（如果直接連接失敗）
// Supabase 使用 Connection Pooling（端口 6543）而不是直接連接（端口 5432）
const useConnectionPooling = process.env.USE_POOLING === 'true' || false;

const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  // 讓 Node.js 自動選擇 IP 版本（IPv4 或 IPv6）
  // 如果系統支持 IPv6，會自動使用 IPv6
};

// 如果使用 Connection Pooling，調整用戶名
if (useConnectionPooling && process.env.DB_PORT === '6543') {
  // Connection Pooling 的用戶名格式：postgres.[project-ref]
  const projectRef = process.env.DB_HOST?.replace('db.', '').replace('.supabase.co', '');
  if (projectRef && !process.env.DB_USER?.includes('.')) {
    poolConfig.user = `postgres.${projectRef}`;
    console.log('使用 Connection Pooling，用戶名已調整為：', poolConfig.user);
  }
}

const pool = new Pool(poolConfig);

// 測試資料庫是否連接成功
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
  }
});

module.exports = pool;
