// 檢查 post_likes 表的結構
require('dotenv').config();
const pool = require('./database/connection');

async function checkTableStructure() {
  try {
    // 檢查表是否存在
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'post_likes'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ post_likes 表不存在');
      console.log('\n請執行以下 SQL 創建表：');
      console.log(`
CREATE TABLE post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_uid VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, author_uid)
);
      `);
      return;
    }
    
    console.log('✅ post_likes 表存在');
    
    // 獲取表的欄位信息
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'post_likes'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 表結構：');
    console.table(columns.rows);
    
    // 檢查是否有類似 user_id 或 user_uid 的欄位
    const userColumns = columns.rows.filter(col => 
      col.column_name.includes('user') || 
      col.column_name.includes('uid') || 
      col.column_name.includes('author')
    );
    
    if (userColumns.length === 0) {
      console.log('\n⚠️  沒有找到用戶相關欄位');
      console.log('可能需要添加 author_uid 欄位或修改現有欄位名稱');
    } else {
      console.log('\n✅ 找到用戶相關欄位：');
      console.table(userColumns);
    }
    
  } catch (error) {
    console.error('檢查表結構失敗：', error);
  } finally {
    await pool.end();
  }
}

checkTableStructure();

