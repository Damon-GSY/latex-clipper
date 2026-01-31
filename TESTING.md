# 测试指南

## 第一步：安装插件

1. 打开 Chrome 浏览器
2. 在地址栏输入 `chrome://extensions/` 并回车
3. 在页面右上角开启「开发者模式」
4. 点击左上角的「加载已解压的扩展程序」
5. 选择这个文件夹：`/Users/damon/Documents/Projects/latex_dev`
6. 看到插件卡片出现，说明安装成功！

## 第二步：测试本地测试页面

1. **打开测试页面**
   - 在 Chrome 中打开文件：`/Users/damon/Documents/Projects/latex_dev/test.html`
   - 或者右键点击 `test.html` → 选择「使用 Chrome 打开」

2. **打开开发者工具查看日志**
   - 按 F12 或右键点击页面 → 选择「检查」
   - 切换到「Console」标签页
   - 你应该看到：`[LaTeX Copy Helper] 插件已加载`
   - 以及：`[LaTeX Copy Helper] 找到 X 个数学公式`

3. **测试复制功能**
   - 将鼠标悬停在任意数学公式上（例如 a² + b² = c²）
   - 应该出现一个紫色渐变的「复制 LaTeX」按钮
   - 点击按钮
   - 右上角应该出现绿色通知：「LaTeX 已复制到剪贴板！」
   - 在任意文本编辑器中粘贴（Ctrl+V 或 Cmd+V），查看复制的 LaTeX 代码

4. **检查控制台输出**
   - 当鼠标悬停在公式上时，控制台应该显示：
     ```
     [LaTeX Copy Helper] 提取到 LaTeX: a^2 + b^2 = c^2
     ```

## 第三步：测试真实网站

### 推荐测试网站

1. **Wikipedia（中文）**
   - https://zh.wikipedia.org/wiki/薛定谔方程
   - 测试公式：薛定谔方程

2. **Wikipedia（英文）**
   - https://en.wikipedia.org/wiki/Maxwell%27s_equations
   - 测试公式：麦克斯韦方程组

3. **Stack Exchange**
   - https://math.stackexchange.com/questions/tagged/linear-algebra
   - 随便打开一个有数学公式的问题

4. **arXiv（需要点进具体论文）**
   - https://arxiv.org/abs/2401.00001
   - 点击 HTML 版本查看

## 常见问题排查

### 问题 1：插件加载失败
**现象**：无法加载扩展程序
**解决**：
- 检查所有文件是否在正确的文件夹中
- 确保 `manifest.json` 格式正确（JSON 语法）
- 查看错误提示，根据提示修改

### 问题 2：没有找到公式
**现象**：控制台显示「找到 0 个数学公式」
**原因**：页面的数学公式可能还没渲染完成
**解决**：
- 刷新页面（F5 或 Cmd+R）
- 等待几秒后再次检查
- 某些网站可能使用了不同的渲染方式

### 问题 3：无法提取 LaTeX
**现象**：鼠标悬停没有出现按钮，控制台显示「无法提取 LaTeX 源码」
**原因**：该网站使用的渲染方式插件暂不支持
**解决**：
- 在控制台查看具体的元素信息
- 将问题网址和元素结构反馈给开发者

### 问题 4：按钮位置不对
**现象**：按钮显示在奇怪的位置
**原因**：页面有固定定位或特殊布局
**解决**：这是已知的小问题，不影响功能，点击按钮仍可复制

## 调试技巧

1. **查看元素结构**
   - 右键点击公式 → 检查
   - 查看 HTML 结构
   - 确认是否有 `.katex`、`.MathJax` 或 `mjx-container` 类名

2. **手动测试提取逻辑**
   在控制台运行：
   ```javascript
   // 查找所有公式元素
   document.querySelectorAll('.katex, .MathJax, mjx-container')

   // 查看某个公式的内部结构
   document.querySelector('.katex').innerHTML
   ```

3. **检查脚本是否注入**
   在控制台运行：
   ```javascript
   // 应该能看到插件的日志
   console.log('检查插件是否运行')
   ```

## 成功标志

✅ 插件加载无错误
✅ 控制台显示「插件已加载」和「找到 X 个数学公式」
✅ 鼠标悬停在公式上出现按钮
✅ 点击按钮后出现绿色通知
✅ 能够在文本编辑器中粘贴 LaTeX 代码

## 下一步

如果一切正常，你可以：
1. 在日常浏览中使用这个插件
2. 根据需要修改样式（编辑 `content.css`）
3. 添加更多功能（例如支持其他渲染库）
4. 打包发布到 Chrome Web Store

祝测试顺利！
