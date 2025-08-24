# Supabase 配置说明

## 1. 修复邮箱验证重定向URL

**问题**: 当前验证邮件中的链接指向 `localhost:3000`，但应用运行在 `localhost:8000`

**解决方案**: 在Supabase Dashboard中配置正确的重定向URL

### 配置步骤：

1. 登录Supabase Dashboard
2. 进入项目设置：**Settings** → **Authentication**
3. 找到 **URL Configuration** 部分
4. 设置以下URL：

```
Site URL: http://localhost:8000
Additional Redirect URLs: 
  - http://localhost:8000/
  - http://localhost:8000/login
  - http://127.0.0.1:8000/
  - http://127.0.0.1:8000/login
```

## 2. 邮箱确认设置（可选）

如果想跳过邮箱确认以便于测试：

1. 进入 **Settings** → **Authentication** 
2. 找到 **User Signups** 部分
3. **取消选中** "Enable email confirmations"

## 3. 测试用户信息

已创建用户：
- **邮箱**: shijianping5000@gmail.com  
- **密码**: wistone614103
- **用户ID**: 30a4b5a3-bbb5-4627-89e0-48a276ccb45d

## 4. 验证配置

配置完成后：
1. 访问 http://127.0.0.1:8000/login
2. 使用上述测试账户登录
3. 确认登录后不再跳转回登录页

## 当前状态检查

- ✅ 后端Supabase Auth集成完成
- ✅ 数据库外键约束正确
- ⚠️  需要配置Supabase重定向URL
- ⚠️  Token验证逻辑需要测试