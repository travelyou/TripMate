// 檢查 travelers 表的狀態
const path = require('path');

// 嘗試從不同位置加載 .env 文件
const rootEnvPath = path.join(__dirname, '..', '.env');
const backendEnvPath = path.join(__dirname, '.env');

if (require('fs').existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
  console.log('✅ 從項目根目錄加載 .env 文件');
} else if (require('fs').existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
  console.log('✅ 從 backend 目錄加載 .env 文件');
} else {
  require('dotenv').config();
  console.log('⚠️ 使用默認 dotenv 配置');
}

const pool = require('./database/connection');

async function checkTravelersTable() {
  try {
    console.log('🔍 開始檢查 travelers 表...\n');

    // 1. 檢查所有 schema
    console.log('1️⃣ 檢查所有 schema:');
    const schemas = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    console.table(schemas.rows);

    // 2. 檢查 travelers schema 是否存在
    console.log('\n2️⃣ 檢查 travelers schema 是否存在:');
    const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = 'travelers'
      )
    `);
    console.log('travelers schema 存在:', schemaCheck.rows[0].exists);

    // 3. 檢查 travelers.travelers 表是否存在
    console.log('\n3️⃣ 檢查 travelers.travelers 表是否存在:');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'travelers'
        AND table_name = 'travelers'
      )
    `);
    console.log('travelers.travelers 表存在:', tableCheck.rows[0].exists);

    // 4. 檢查所有名為 travelers 的表（任何 schema）
    console.log('\n4️⃣ 檢查所有名為 travelers 的表:');
    const allTravelersTables = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'travelers'
      ORDER BY table_schema
    `);
    if (allTravelersTables.rows.length > 0) {
      console.table(allTravelersTables.rows);
    } else {
      console.log('❌ 沒有找到名為 travelers 的表');
    }

    // 5. 檢查當前 search_path
    console.log('\n5️⃣ 檢查當前 search_path:');
    const searchPath = await pool.query('SHOW search_path');
    console.log('當前 search_path:', searchPath.rows[0].search_path);

    // 6. 設置 search_path 並再次檢查
    console.log('\n6️⃣ 設置 search_path 為 public, travelers, discussion:');
    await pool.query('SET search_path TO public, travelers, discussion');
    const newSearchPath = await pool.query('SHOW search_path');
    console.log('新的 search_path:', newSearchPath.rows[0].search_path);

    // 7. 嘗試直接查詢表
    console.log('\n7️⃣ 嘗試查詢 travelers.travelers 表:');
    try {
      const result = await pool.query('SELECT COUNT(*) FROM travelers.travelers');
      console.log('✅ 查詢成功，記錄數:', result.rows[0].count);
    } catch (err) {
      console.error('❌ 查詢失敗:', err.message);
      console.error('錯誤代碼:', err.code);
    }

    // 8. 嘗試使用 search_path 查詢（不指定 schema）
    console.log('\n8️⃣ 嘗試使用 search_path 查詢（不指定 schema）:');
    try {
      const result = await pool.query('SELECT COUNT(*) FROM travelers');
      console.log('✅ 查詢成功，記錄數:', result.rows[0].count);
    } catch (err) {
      console.error('❌ 查詢失敗:', err.message);
      console.error('錯誤代碼:', err.code);
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    console.error('錯誤堆疊:', error.stack);

    // 如果是環境變數問題，提供提示
    if (error.message && error.message.includes('環境變數')) {
      console.error('\n💡 提示：');
      console.error('請確認 .env 文件存在且包含以下變數：');
      console.error('  - DB_URL 或 DATABASE_URL（連接字符串）');
      console.error('  或');
      console.error('  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
      console.error('\n.env 文件應該在項目根目錄或 backend 目錄下');
    }
  } finally {
    try {
      await pool.end();
    } catch (err) {
      // 忽略關閉連接時的錯誤
    }
    console.log('\n✅ 檢查完成');
  }
}

checkTravelersTable();

