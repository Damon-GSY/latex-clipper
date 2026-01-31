#!/bin/bash

echo "==================================="
echo "LaTeX Copy Helper - 快速测试"
echo "==================================="
echo ""

# 检查文件是否存在
echo "检查文件..."
required_files=("manifest.json" "content.js" "content.css" "test.html")
all_exist=true

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file 存在"
    else
        echo "✗ $file 不存在"
        all_exist=false
    fi
done

echo ""

if [ "$all_exist" = true ]; then
    echo "✅ 所有必需文件都存在！"
    echo ""
    echo "下一步操作："
    echo "1. 在 Chrome 中访问: chrome://extensions/"
    echo "2. 开启「开发者模式」"
    echo "3. 点击「加载已解压的扩展程序」"
    echo "4. 选择此文件夹: $(pwd)"
    echo ""
    echo "然后在 Chrome 中打开: file://$(pwd)/test.html"
    echo ""
    
    # 尝试在浏览器中打开测试页面
    if command -v open &> /dev/null; then
        read -p "是否在浏览器中打开测试页面？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open test.html
            echo "✓ 已在浏览器中打开测试页面"
        fi
    fi
else
    echo "❌ 缺少必需文件，请检查！"
fi

echo ""
echo "查看详细测试指南: cat TESTING.md"
