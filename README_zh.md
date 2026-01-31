# LaTeX Clipper

> "Talk is cheap. Show me the code." — LaTeX Clipper 把 LaTeX 代码给你看。

一个浏览器扩展，自动识别页面上的数学公式，让你一键复制 LaTeX 源码。悬停、点击、完成。

## 功能说明

MathJax 和 KaTeX 渲染的公式很漂亮，但想要获取源代码却很麻烦。LaTeX Clipper 解决这个问题：

- **悬停** 在任意 MathJax 或 KaTeX 公式上 → 复制按钮出现
- **点击** 按钮 → LaTeX 源码复制到剪贴板
- **完成**

## 支持的渲染库

| 渲染库 | 支持状态 |
|--------|---------|
| MathJax 2.x | ✅ |
| MathJax 3.x | ✅ |
| KaTeX | ✅ |

- 自动识别公式
- 一键复制
- 支持动态加载的内容
- 无需配置

## 安装方法

### Chrome/Edge/Brave

1. 下载本仓库
2. 打开 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `latex-clipper` 文件夹

### Firefox

1. 下载本仓库
2. 打开 `about:debugging#/runtime/this-firefox`
3. 点击"临时加载附加组件"
4. 选择 `manifest.json`

## 工作原理

```
┌─────────────────────────────────────────────────────┐
│  网页: x² + y² = r² (MathJax/KaTeX 渲染)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [悬停] → [复制 LaTeX] 按钮出现                    │
│            ┌─────────────┐                          │
│            │ 复制 LaTeX  │ ← 点击                   │
│            └─────────────┘                          │
│                                                     │
│  结果: x^2 + y^2 = r^2 (已复制到剪贴板)            │
└─────────────────────────────────────────────────────┘
```

### 提取方法

| 渲染器 | 提取方式 |
|--------|---------|
| MathJax 2.x | `<script type="math/tex">` 标签 |
| MathJax 3.x | `<annotation encoding="application/x-tex">` 标签 |
| KaTeX | `<annotation>` 标签或 `data-latex` 属性 |

## 开发路线

- [ ] 键盘快捷键 (Ctrl/Cmd + Shift + C)
- [ ] 设置面板（主题、按钮位置）
- [ ] 右键菜单
- [ ] 批量复制/导出所有公式
- [ ] 完整支持 MathJax CHTML

## 贡献

欢迎提交 Pull Request。保持简洁，保持可用。

## 许可证

MIT
