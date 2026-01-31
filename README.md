# LaTeX Copy Helper

一个 Chrome 浏览器扩展插件，可以自动识别网页上的 LaTeX 数学公式（支持 MathJax 和 KaTeX），并提供一键复制 LaTeX 源码的功能。

## 功能特性

- 自动识别 MathJax（2.x 和 3.x）渲染的数学公式
- 自动识别 KaTeX 渲染的数学公式
- 鼠标悬停在公式上时显示复制按钮
- 一键复制 LaTeX 源码到剪贴板
- 美观的 UI 设计和动画效果
- 支持动态加载的公式内容

## 安装方法

### 从源代码安装（开发者模式）

1. 下载或克隆此仓库到本地
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 在右上角开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹
6. 插件安装完成！

### 注意事项

插件需要图标文件才能完全运行。你需要准备以下三个图标文件：
- `icon16.png` (16x16 像素)
- `icon48.png` (48x48 像素)
- `icon128.png` (128x128 像素)

如果暂时没有图标，可以注释掉 `manifest.json` 中的 `icons` 部分。

## 使用方法

1. 访问任何包含 LaTeX 数学公式的网页（例如 Wikipedia、arXiv、Stack Exchange 等）
2. 将鼠标悬停在任意数学公式上
3. 点击出现的"复制 LaTeX"按钮
4. LaTeX 源码已复制到剪贴板，可以直接粘贴使用

## 支持的网站示例

- [Wikipedia](https://en.wikipedia.org/wiki/Schr%C3%B6dinger_equation)
- [arXiv.org](https://arxiv.org/)
- [Mathematics Stack Exchange](https://math.stackexchange.com/)
- [Khan Academy](https://www.khanacademy.org/)
- 任何使用 MathJax 或 KaTeX 渲染数学公式的网站

## 技术实现

### 文件结构

```
latex_dev/
├── manifest.json      # Chrome 扩展配置文件
├── content.js         # 内容脚本 - 核心功能实现
├── content.css        # 样式文件
└── README.md          # 说明文档
```

### 核心功能

1. **公式识别**: 通过 DOM 查询识别页面上的 MathJax 和 KaTeX 元素
2. **源码提取**: 从不同的渲染库中提取原始 LaTeX 代码
   - MathJax 2.x: 从 `<script type="math/tex">` 标签提取
   - MathJax 3.x: 从 `<annotation>` 标签提取
   - KaTeX: 从 `<annotation>` 标签或相邻元素提取
3. **动态监听**: 使用 MutationObserver 监听 DOM 变化，支持动态加载的公式
4. **剪贴板操作**: 使用现代 Clipboard API 和降级方案确保兼容性

## 开发和调试

如果你想修改或增强这个插件：

1. 修改代码后，回到 `chrome://extensions/`
2. 点击插件卡片上的"刷新"按钮
3. 重新加载包含公式的网页进行测试

### 调试技巧

- 在内容脚本中使用 `console.log()` 输出调试信息
- 在网页上按 F12 打开开发者工具查看控制台输出
- 检查 `content.js` 中的提取逻辑是否正确识别公式

## 已知限制

- 某些特殊的 LaTeX 渲染实现可能无法识别
- 如果网站使用了自定义的公式渲染方式，可能需要额外的适配
- 对于图片形式的公式，无法提取源码

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
# latex-clipper
