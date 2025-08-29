-- 修复记录表的form_type字段，使其支持自定义学习形式类型
-- 问题：form_type被定义为resource_type枚举，限制了只能使用预定义值
-- 解决：将form_type改为VARCHAR类型，允许存储自定义类型代码

-- 1. 首先备份现有数据（可选，用于安全）
-- CREATE TABLE public.records_backup AS SELECT * FROM public.records;

-- 2. 修改form_type列类型
ALTER TABLE public.records 
ALTER COLUMN form_type TYPE VARCHAR(50) 
USING form_type::text;

-- 3. 添加注释说明
COMMENT ON COLUMN public.records.form_type IS '学习形式类型代码 - 可以是预定义类型(video/book等)或自定义类型(custom_xxx)';

-- 4. 验证修改成功
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'records' 
--   AND column_name = 'form_type';

-- 注意事项：
-- 1. 此迁移将form_type从枚举类型改为VARCHAR(50)
-- 2. 现有数据不会丢失，枚举值会自动转换为文本
-- 3. 执行前请确保有数据库备份
-- 4. 执行后需要重启后端服务以生效