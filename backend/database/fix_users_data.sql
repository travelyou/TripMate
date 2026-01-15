-- 修復 users 表中的數據問題

-- 1. 修復 real_name 欄位中錯誤存儲的 email
-- 將包含 @ 符號的 real_name 設為 NULL
UPDATE users
SET real_name = NULL, updated_at = CURRENT_TIMESTAMP
WHERE real_name IS NOT NULL 
  AND (real_name LIKE '%@%' OR real_name ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- 2. 統一 bio 和 spirit_animal 的空值處理
-- 將空字符串轉換為 NULL
UPDATE users
SET bio = NULL, updated_at = CURRENT_TIMESTAMP
WHERE bio = '';

UPDATE users
SET spirit_animal = NULL, updated_at = CURRENT_TIMESTAMP
WHERE spirit_animal = '';

-- 3. 清理並修復數據
-- 確保所有空字符串都轉換為 NULL
UPDATE users
SET 
  nickname = NULLIF(TRIM(nickname), ''),
  real_name = NULLIF(TRIM(real_name), ''),
  bio = NULLIF(TRIM(bio), ''),
  spirit_animal = NULLIF(TRIM(spirit_animal), ''),
  updated_at = CURRENT_TIMESTAMP
WHERE 
  (nickname IS NOT NULL AND TRIM(nickname) = '')
  OR (real_name IS NOT NULL AND TRIM(real_name) = '')
  OR (bio IS NOT NULL AND TRIM(bio) = '')
  OR (spirit_animal IS NOT NULL AND TRIM(spirit_animal) = '');

-- 4. 驗證修復結果
SELECT 
  uid,
  email,
  nickname,
  real_name,
  CASE 
    WHEN real_name LIKE '%@%' THEN '⚠️ 仍包含 @'
    WHEN real_name IS NULL THEN '✓ NULL'
    ELSE '✓ 正常'
  END as real_name_status,
  CASE 
    WHEN bio = '' THEN '⚠️ 空字符串'
    WHEN bio IS NULL THEN '✓ NULL'
    ELSE '✓ 正常'
  END as bio_status,
  CASE 
    WHEN spirit_animal = '' THEN '⚠️ 空字符串'
    WHEN spirit_animal IS NULL THEN '✓ NULL'
    ELSE '✓ 正常'
  END as spirit_animal_status
FROM users
ORDER BY created_at DESC;

