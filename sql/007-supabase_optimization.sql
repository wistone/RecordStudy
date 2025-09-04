-- Supabase数据库优化索引（简化版）
-- 在Supabase控制台的SQL编辑器中执行

-- 1. records表关键索引
CREATE INDEX IF NOT EXISTS idx_records_user_time ON records(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_user_form_type ON records(user_id, form_type);
CREATE INDEX IF NOT EXISTS idx_records_resource ON records(resource_id);

-- 2. resource_tags表索引（修正表名）
CREATE INDEX IF NOT EXISTS idx_resource_tags_resource_id ON resource_tags(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_tag_id ON resource_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_user_resource ON resource_tags(user_id, resource_id);

-- 3. tags表索引
CREATE INDEX IF NOT EXISTS idx_tags_created_by ON tags(created_by);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tag_name);

-- 4. resources表索引
CREATE INDEX IF NOT EXISTS idx_resources_created_by ON resources(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

-- 5. 更新统计信息
ANALYZE records;
ANALYZE resource_tags; 
ANALYZE tags;
ANALYZE resources;