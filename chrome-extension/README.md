# 学习搭子 Chrome 扩展

一个强大的学习追踪 Chrome 浏览器扩展，让你在浏览任何网页时都能方便地记录和管理学习活动。

## 功能特性

### 🎯 核心功能
- **侧边栏集成**: 在任何网页右侧显示可调节宽度的学习追踪界面
- **智能宽度调节**: 支持 15%-45% 宽度范围，拖拽调节，设置自动保存
- **响应式设计**: 完美适配桌面和移动端浏览器
- **深色模式支持**: 自动适配系统主题设置

### 📱 用户体验
- **一键开启**: 点击工具栏图标即可开启/关闭侧边栏
- **智能布局**: 自动压缩原网页内容，不遮挡任何信息
- **流畅动画**: 平滑的显示/隐藏过渡效果
- **快捷控制**: 侧边栏内置关闭按钮，操作便捷

### 🔧 技术特性
- **Manifest V3**: 使用最新的 Chrome 扩展 API
- **高性能**: 轻量级设计，不影响网页加载速度
- **安全可靠**: 严格的权限控制，保护用户隐私
- **兼容性强**: 支持 Chrome 88+ 版本

## 快速开始

### 方式一：一键部署 (推荐)
```bash
cd chrome-extension
./deploy.sh
```

### 方式二：手动安装
1. 在 Chrome 中访问 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `chrome-extension` 目录

## 项目结构

```
chrome-extension/
├── manifest.json          # 扩展配置文件
├── background.js          # 后台服务脚本
├── content.js            # 内容脚本 (核心功能)
├── sidebar.css           # 侧边栏样式
├── popup/                # 控制面板
│   ├── popup.html        
│   └── popup.js          
├── icons/                # 扩展图标
│   ├── icon16.png        
│   ├── icon48.png        
│   └── icon128.png       
├── deploy.sh            # 部署脚本
└── README.md            # 说明文档
```

## 开发指南

### 本地开发
```bash
# 1. 克隆项目
git clone <repository-url>
cd RecordStudy/chrome-extension

# 2. 生成图标 (可选)
python create-icons.py

# 3. 在 Chrome 中加载扩展
# 访问 chrome://extensions/
# 开启开发者模式
# 加载已解压的扩展程序

# 4. 修改代码后重新加载扩展即可测试
```

### 代码说明

#### manifest.json
扩展的核心配置文件，定义权限、脚本和资源。

#### background.js
后台服务工作进程，处理：
- 扩展状态管理
- 消息传递
- 图标徽章更新
- 存储管理

#### content.js
内容脚本，注入到每个网页中，负责：
- 创建和管理侧边栏 DOM
- 处理宽度调节功能
- 响应后台脚本消息
- 管理页面布局变化

#### sidebar.css
侧边栏样式文件，包含：
- 响应式布局
- 深色模式支持
- 动画过渡效果
- 高对比度支持

### 自定义配置

#### 修改默认宽度
```javascript
// 在 content.js 中修改
this.currentWidth = 25; // 默认 25% 宽度
this.minWidth = 10;     // 最小 10% 
this.maxWidth = 50;     // 最大 50%
```

#### 修改目标网站
```javascript
// 在 content.js 中修改 iframe 源地址
this.iframe.src = 'https://your-custom-domain.com';
```

#### 添加自定义样式
```css
/* 在 sidebar.css 中添加自定义样式 */
.learning-buddy-sidebar.custom-theme {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 测试指南

### 功能测试清单
- [ ] 扩展图标显示正常
- [ ] 点击图标能开启/关闭侧边栏
- [ ] 侧边栏宽度可以拖拽调节
- [ ] 设置能正确保存和恢复
- [ ] 在不同网站上都能正常工作
- [ ] 深色模式下显示正常
- [ ] 移动端响应式布局正确
- [ ] iframe 内容加载正常

### 兼容性测试
推荐在以下环境测试：
- Chrome 88+
- Chrome Beta
- Chromium
- Microsoft Edge (Chromium 内核)

### 性能测试
- 扩展加载时间 < 100ms
- 侧边栏显示/隐藏动画流畅
- 不影响原网页的加载速度
- 内存占用 < 10MB

## 常见问题

### Q: 侧边栏不显示？
A: 检查以下几点：
1. 确认扩展已启用
2. 刷新页面重试
3. 检查控制台错误信息
4. 确认不是在特殊页面 (chrome://, extension://)

### Q: 无法调节宽度？
A: 可能的原因：
1. 鼠标操作位置不正确，应在侧边栏左边缘
2. 网页样式冲突，尝试在其他网站测试
3. 扩展权限不足，重新加载扩展

### Q: iframe 内容无法加载？
A: 检查以下几点：
1. 网络连接是否正常
2. 目标网站是否允许 iframe 嵌入
3. 检查 manifest.json 中的 host_permissions

## 贡献指南

欢迎贡献代码和建议！

### 贡献流程
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范
- 使用 ES6+ 语法
- 遵循 Google JavaScript 代码规范
- 添加必要的注释
- 保持代码简洁和可读性

## 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](../LICENSE) 文件。

## 支持

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 项目主页: https://your-study-buddy.onrender.com

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持！