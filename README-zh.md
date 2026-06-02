# Bookmark Organizer

面向 macOS 的浏览器书签自动整理工具。

这个工具会自动扫描本机浏览器书签，清洗 URL、去重、检查失效链接，并输出整理后的结果和报告。

英文版请见 [README.md](./README.md)。

## 它会做什么

- 自动查找 Mac 上常见 Chromium 系浏览器的书签文件
- 清理 URL 中常见的追踪参数
- 跨 profile 去重
- 按域名归类，让导出结果更清楚
- 检查失效链接
- 只输出整理结果，不直接改你的浏览器资料
- 提供热门文件夹、热门域名、重复样例和 profile 覆盖情况

## 输出内容

默认会输出三份文件：

- `out/bookmarks-cleaned.html`，可用于重新导入或归档
- `out/bookmarks.json`，方便二次处理
- `out/report.md`，快速查看摘要

## 用法

```bash
npm install
npm start
```

## 参数

- `--no-write` 只打印报告，不写文件
- `--out <dir>` 指定输出目录
- `--skip-link-check` 跳过网络死链检测
- `--limit <n>` 限制检查的书签数量
- `--json` 输出完整 JSON 摘要

## 设计说明

- 它只读取本地浏览器数据，不会直接改动 profile 文件。
- URL 规范化只移除常见追踪参数，其余内容保留。
- 失效链接检测是尽力而为，也可以完全跳过。
- 设计上只做一件事：读取、整理、导出。

## 示例报告

```md
- Sources scanned: 4
- Bookmarks discovered: 1,842
- Unique bookmarks kept: 1,221
- Duplicates removed: 621
- Dead links: 18
```

## 更多

- [工作原理](docs/how-it-works.md)
- [排障说明](docs/troubleshooting.md)
- [示例报告](examples/sample-report.md)
- [示例清理报告](examples/sample-cleanup-report.md)

## 支持来源

- Google Chrome
- Chromium
- Microsoft Edge
- Brave Browser
- Vivaldi
- Opera
