# Chrome 扩展图标文件

此目录需要包含以下PNG图标文件：

- `icon16.png` - 16x16 像素，扩展工具栏图标
- `icon48.png` - 48x48 像素，扩展管理页面图标  
- `icon128.png` - 128x128 像素，Chrome Web Store 图标

## 快速生成图标

### 方法1: 使用在线工具
1. 访问 https://favicon.io/favicon-generator/ 
2. 上传设计或输入文字 "学习搭子" 或 "LB"
3. 选择绿色主题色 #4CAF50
4. 下载生成的图标包
5. 重命名文件为 icon16.png, icon48.png, icon128.png

### 方法2: 使用系统工具
在 macOS 上：
```bash
# 安装 ImageMagick
brew install imagemagick

# 从SVG生成PNG (如果你有SVG文件)
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png  
convert icon.svg -resize 128x128 icon128.png
```

### 方法3: 使用 Python 脚本
```bash
# 安装依赖
pip install Pillow

# 运行生成脚本
python ../create-icons.py
```

## 设计建议

图标应该体现学习和记录的概念：
- 📚 书本图标
- ✏️ 笔记图标  
- 📊 图表图标
- 🎯 目标图标
- 使用绿色主题色 #4CAF50
- 确保在小尺寸下清晰可见

## 临时占位图标

如果暂时没有图标文件，Chrome会使用默认图标，但建议尽快添加自定义图标以提升用户体验。