#!/usr/bin/env python3
"""
Generate PNG icons from SVG for Chrome Extension
Requires: pip install Pillow cairosvg

This script converts the SVG icon to required PNG sizes for Chrome extension.
"""

import os
from pathlib import Path

try:
    import cairosvg
    from PIL import Image
    import io
except ImportError:
    print("缺少依赖库。请运行: pip install Pillow cairosvg")
    print("在 macOS 上，可能还需要: brew install cairo pango")
    exit(1)

def svg_to_png(svg_path, output_path, size):
    """Convert SVG to PNG with specified size"""
    try:
        # Convert SVG to PNG bytes
        png_bytes = cairosvg.svg2png(
            url=svg_path,
            output_width=size,
            output_height=size
        )
        
        # Save PNG file
        with open(output_path, 'wb') as f:
            f.write(png_bytes)
            
        print(f"✅ 生成图标: {output_path} ({size}x{size})")
        return True
        
    except Exception as e:
        print(f"❌ 生成失败 {output_path}: {e}")
        return False

def create_fallback_icons():
    """Create simple fallback icons using PIL if cairosvg fails"""
    from PIL import Image, ImageDraw, ImageFont
    
    sizes = [16, 48, 128]
    icons_dir = Path(__file__).parent / 'icons'
    
    for size in sizes:
        # Create a simple colored circle with text
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Background circle
        margin = size // 10
        draw.ellipse([margin, margin, size-margin, size-margin], 
                    fill=(76, 175, 80, 255))  # #4CAF50
        
        # Text
        if size >= 48:
            try:
                # Try to use a system font
                font_size = size // 4
                font = ImageFont.load_default()
                text = "学"
                bbox = draw.textbbox((0, 0), text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
                x = (size - text_width) // 2
                y = (size - text_height) // 2
                draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
            except:
                # Simple rectangle if font fails
                rect_size = size // 3
                x = (size - rect_size) // 2
                y = (size - rect_size) // 2
                draw.rectangle([x, y, x + rect_size, y + rect_size], 
                             fill=(255, 255, 255, 200))
        
        output_path = icons_dir / f'icon{size}.png'
        img.save(output_path, 'PNG')
        print(f"✅ 生成备用图标: {output_path} ({size}x{size})")

def main():
    # Get paths
    script_dir = Path(__file__).parent
    icons_dir = script_dir / 'icons'
    svg_path = icons_dir / 'icon.svg'
    
    # Required icon sizes for Chrome extension
    sizes = [16, 48, 128]
    
    print("🎨 开始生成 Chrome 扩展图标...")
    print(f"📁 图标目录: {icons_dir}")
    print(f"📄 源文件: {svg_path}")
    
    if not svg_path.exists():
        print(f"❌ SVG 文件不存在: {svg_path}")
        return
    
    success_count = 0
    
    # Try to convert SVG to PNG
    for size in sizes:
        output_path = icons_dir / f'icon{size}.png'
        if svg_to_png(str(svg_path), str(output_path), size):
            success_count += 1
    
    # If SVG conversion failed, create fallback icons
    if success_count == 0:
        print("\n⚠️  SVG 转换失败，生成备用图标...")
        create_fallback_icons()
        success_count = len(sizes)
    
    print(f"\n✨ 完成! 成功生成 {success_count}/{len(sizes)} 个图标")
    print("\n📋 生成的图标文件:")
    for size in sizes:
        icon_path = icons_dir / f'icon{size}.png'
        if icon_path.exists():
            print(f"  • icon{size}.png")

if __name__ == '__main__':
    main()