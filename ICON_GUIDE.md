# 图标生成指南

由于 Chrome 扩展需要 PNG 格式的图标，你需要将提供的 SVG 图标转换为 PNG。

## 方法 1：在线转换（推荐）

1. 访问以下任意一个在线转换工具：
   - https://cloudconvert.com/svg-to-png
   - https://convertio.co/svg-png/
   - https://www.aconvert.com/image/svg-to-png/

2. 上传 `icon.svg` 文件

3. 转换三次，分别设置不同的尺寸：
   - 16x16 像素 → 保存为 `icon16.png`
   - 48x48 像素 → 保存为 `icon48.png`
   - 128x128 像素 → 保存为 `icon128.png`

4. 将生成的三个 PNG 文件放在项目根目录

## 方法 2：使用 ImageMagick（命令行）

如果你安装了 ImageMagick，可以在终端运行：

```bash
# 安装 ImageMagick (如果尚未安装)
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick
# Windows: 从官网下载 https://imagemagick.org/

# 转换图标
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

## 方法 3：临时解决方案

如果你只是想快速测试插件功能，可以暂时注释掉 `manifest.json` 中的图标配置：

```json
{
  "manifest_version": 3,
  "name": "LaTeX Copy Helper",
  "version": "1.0.0",
  "description": "自动识别页面上的 LaTeX 公式（MathJax 和 KaTeX），并提供一键复制源码功能",
  "permissions": [
    "clipboardWrite"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ]
  // 临时注释掉图标部分
  // "icons": {
  //   "16": "icon16.png",
  //   "48": "icon48.png",
  //   "128": "icon128.png"
  // }
}
```

插件仍然可以正常工作，只是在扩展管理页面中显示默认图标。
