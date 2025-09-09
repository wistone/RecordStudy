#!/bin/bash

# Chrome Extension Deployment Script for Learning Buddy
# 学习搭子 Chrome 扩展部署脚本

set -e

echo "🚀 学习搭子 Chrome 扩展部署脚本"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_NAME="learning-buddy-extension"
BUILD_DIR="$SCRIPT_DIR/build"
PACKAGE_DIR="$SCRIPT_DIR/package"

echo -e "${BLUE}📁 扩展目录: $SCRIPT_DIR${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Validate required files
echo -e "\n${YELLOW}📋 步骤 1: 验证必需文件${NC}"
required_files=(
    "manifest.json"
    "background.js"
    "content.js"
    "sidebar.css"
    "popup/popup.html"
    "popup/popup.js"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [[ -f "$SCRIPT_DIR/$file" ]]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -gt 0 ]]; then
    echo -e "${RED}❌ 缺少必需文件，无法继续部署${NC}"
    exit 1
fi

# Step 2: Check for icons
echo -e "\n${YELLOW}📋 步骤 2: 检查图标文件${NC}"
icon_files=("icons/icon16.png" "icons/icon48.png" "icons/icon128.png")
missing_icons=()

for icon in "${icon_files[@]}"; do
    if [[ -f "$SCRIPT_DIR/$icon" ]]; then
        echo -e "${GREEN}✅ $icon${NC}"
    else
        echo -e "${YELLOW}⚠️  $icon (缺失)${NC}"
        missing_icons+=("$icon")
    fi
done

if [[ ${#missing_icons[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  警告: 缺少图标文件，请参考 icons/README.md 生成图标${NC}"
    echo -e "${YELLOW}   扩展仍可工作，但会使用默认图标${NC}"
fi

# Step 3: Validate manifest.json
echo -e "\n${YELLOW}📋 步骤 3: 验证 manifest.json${NC}"
if command_exists jq; then
    # Check manifest version
    manifest_version=$(jq -r '.manifest_version' "$SCRIPT_DIR/manifest.json")
    extension_version=$(jq -r '.version' "$SCRIPT_DIR/manifest.json")
    extension_name=$(jq -r '.name' "$SCRIPT_DIR/manifest.json")
    
    echo -e "${GREEN}✅ 扩展名称: $extension_name${NC}"
    echo -e "${GREEN}✅ 扩展版本: $extension_version${NC}"
    echo -e "${GREEN}✅ Manifest 版本: $manifest_version${NC}"
    
    if [[ "$manifest_version" != "3" ]]; then
        echo -e "${YELLOW}⚠️  建议使用 Manifest V3${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未安装 jq，跳过 JSON 验证 (可选)${NC}"
    echo -e "${GREEN}✅ manifest.json 文件存在${NC}"
fi

# Step 4: Create build directory
echo -e "\n${YELLOW}📦 步骤 4: 准备构建目录${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
echo -e "${GREEN}✅ 创建构建目录: $BUILD_DIR${NC}"

# Step 5: Copy files
echo -e "\n${YELLOW}📦 步骤 5: 复制扩展文件${NC}"
cp "$SCRIPT_DIR/manifest.json" "$BUILD_DIR/"
cp "$SCRIPT_DIR/background.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/content.js" "$BUILD_DIR/"
cp "$SCRIPT_DIR/sidebar.css" "$BUILD_DIR/"

# Copy popup directory
mkdir -p "$BUILD_DIR/popup"
cp "$SCRIPT_DIR/popup/popup.html" "$BUILD_DIR/popup/"
cp "$SCRIPT_DIR/popup/popup.js" "$BUILD_DIR/popup/"

# Copy icons if they exist
if [[ -d "$SCRIPT_DIR/icons" ]]; then
    mkdir -p "$BUILD_DIR/icons"
    cp -r "$SCRIPT_DIR/icons"/* "$BUILD_DIR/icons/" 2>/dev/null || true
fi

echo -e "${GREEN}✅ 文件复制完成${NC}"

# Step 6: Create package
echo -e "\n${YELLOW}📦 步骤 6: 创建发布包${NC}"
mkdir -p "$PACKAGE_DIR"

# Create ZIP for Chrome Web Store
if command_exists zip; then
    cd "$BUILD_DIR"
    zip_filename="${EXTENSION_NAME}-v$(date +%Y%m%d-%H%M%S).zip"
    zip_path="$PACKAGE_DIR/$zip_filename"
    
    zip -r "$zip_path" . -x "*.DS_Store*" "*/.*"
    echo -e "${GREEN}✅ 创建 ZIP 包: $zip_path${NC}"
    
    # Show zip contents
    echo -e "\n${BLUE}📋 ZIP 包内容:${NC}"
    unzip -l "$zip_path" | grep -E '\.(json|js|html|css|png)$' || true
    
    cd "$SCRIPT_DIR"
else
    echo -e "${YELLOW}⚠️  未安装 zip 命令，跳过打包${NC}"
    echo -e "${BLUE}ℹ️  构建文件位于: $BUILD_DIR${NC}"
fi

# Step 7: Generate installation instructions
echo -e "\n${YELLOW}📋 步骤 7: 生成安装说明${NC}"
cat > "$BUILD_DIR/INSTALL.md" << 'EOF'
# Learning Buddy Chrome Extension Installation

## 开发者模式安装 (本地测试)

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择此构建目录
6. 扩展将出现在工具栏中

## 使用方法

1. 点击工具栏中的学习搭子图标开启侧边栏
2. 或右键点击图标选择选项
3. 侧边栏会在任何网页右侧显示
4. 可拖拽左边缘调整宽度
5. 点击右上角 × 关闭侧边栏

## 功能特性

- ✅ 在任何网页上显示侧边栏
- ✅ 可调节宽度 (15%-45%)
- ✅ 响应式设计，支持移动端
- ✅ 深色模式支持
- ✅ 设置自动保存
- ✅ 完整的学习追踪功能

## 故障排除

如果遇到问题：
1. 检查 Chrome 版本 (需要 88+)
2. 确认所有文件完整
3. 重新加载扩展程序
4. 查看控制台错误信息

EOF

echo -e "${GREEN}✅ 安装说明已生成${NC}"

# Step 8: Final summary
echo -e "\n${GREEN}🎉 部署完成!${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ 构建目录: $BUILD_DIR${NC}"
echo -e "${GREEN}✅ 安装说明: $BUILD_DIR/INSTALL.md${NC}"

if [[ -n "$zip_path" && -f "$zip_path" ]]; then
    echo -e "${GREEN}✅ 发布包: $zip_path${NC}"
    
    # Get file size
    if command_exists du; then
        size=$(du -h "$zip_path" | cut -f1)
        echo -e "${BLUE}📦 包大小: $size${NC}"
    fi
fi

echo -e "\n${BLUE}🔧 下一步操作:${NC}"
echo -e "1. 在 Chrome 中加载扩展进行测试"
echo -e "2. 如需发布，将 ZIP 包上传到 Chrome Web Store"
echo -e "3. 参考 publishing-guide.md 了解发布流程"

if [[ ${#missing_icons[@]} -gt 0 ]]; then
    echo -e "\n${YELLOW}📝 改进建议:${NC}"
    echo -e "• 添加自定义图标以获得更好的用户体验"
    echo -e "• 参考 icons/README.md 了解如何生成图标"
fi

echo -e "\n${GREEN}部署脚本执行成功! 🚀${NC}"