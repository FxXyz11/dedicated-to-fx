# Dedicated to Fx

为 Fx 设计的本地优先英语阅读学习 PWA。

学习从完整文章开始，通过语境猜测、渐进提示、核心概念、跨语境迁移和返回重读，逐渐减少对逐词中文翻译的依赖。

当前内置 8 篇原创学习文章、16 个核心概念和 16 个完整渐进学习单元；事实型文章保留博物馆、植物园、研究论文或 NASA 的参考链接。

## 本地运行

需要 Node.js 24 与 pnpm 11。

~~~bash
pnpm install
pnpm dev
~~~

## 验证

~~~bash
pnpm test
pnpm build
~~~

生产构建输出到 dist。项目已经包含 GitHub Pages 工作流，推送到 main 后可在仓库 Pages 设置中选择 GitHub Actions。

## 数据

- 学习记录保存在浏览器 IndexedDB。
- 已缓存的应用和内置文章可离线打开。
- Settings 页面可以导出或恢复版本化 JSON 学习手稿。
- Journal 提供按日期书写的私人日记，写过的日期会在月历中填充。
- Plans 分为每日习惯与计划，记录同样只保存在本机。
- Library 可以导入英文纯文本；Dashboard 会按本地日期轮换每日推荐。
- 没有登录、云数据库、分析追踪或客户端 API Key。

详细产品与工程约束见 docs 与 AGENTS.md。
