-- 修复 likes 表的外键约束，使其支持 traveler 类型的帖子
-- 
-- 问题：当前外键约束 post_likes_post_id_fkey 只指向 discussion 表
-- 这导致 traveler 类型的帖子无法创建按赞记录
--
-- 解决方案：删除旧的外键约束，因为我们已经通过 board 字段和代码逻辑来确保数据完整性

-- 1. 删除旧的外键约束
ALTER TABLE public.likes 
DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;

-- 2. 可选：如果需要保持数据完整性，可以创建一个检查约束
-- 但更好的方法是在应用层通过代码逻辑来保证（已经实现）

-- 注意：执行此脚本后，需要确保：
-- 1. 代码中已经正确验证 post_id 存在于对应的表中（已实现）
-- 2. board 字段正确标识帖子类型（已实现）

