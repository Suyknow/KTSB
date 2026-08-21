# Changelog

本文件记录 leg3sb 子项目的代码变更（不含 README 文档变更）。

## 2026-08-21

### 后端

- 新增 `api/_lib/mongo.js`：抽取统一的 MongoDB 连接模块。懒加载 + 全局 Promise 复用（开发环境防热重载重复连接、生产环境复用 serverless 暖实例连接），数据库名统一从 `MONGODB_DB_NAME` 读取（默认 `counter_db`），不再在模块加载期抛错。
- 重构 `api/counter.js`：改用共享连接模块，移除重复的连接样板、模块加载期 `throw` 与硬编码的 `"counter_db"`；新增 `OPTIONS` 预检短路，跨域预检不再返回 `405`。
- 重构 `api/messages.js`：
  - 移除 MongoDB 驱动 v6 已废弃的 `useNewUrlParser` / `useUnifiedTopology` 选项。
  - 消息保留策略改为「只保留最近 1000 条」：插入后超出阈值即删除最旧一条。
  - 单条消息长度上限由 50 调整为 140 字符。
  - 在 `timestamp` 上建索引，`since` / `sort` 查询由全表扫描 + 内存排序变为索引扫描。
  - 移除与 `vercel.json` 重复的手动 CORS 头，统一交由 `vercel.json` 处理；新增 `OPTIONS` 预检短路。

### 配置

- `vercel.json`：移除 `Access-Control-Allow-Credentials: true`。它与同文件中的 `Access-Control-Allow-Origin: *` 是 CORS 规范明确冲突的组合（浏览器会拒绝带凭据的通配符源请求），且本项目不使用凭据，故删除。

### 前端（`public/index.html`）

- 计数器重构为三池模型：`confirmedTotal` + `inFlight` + `localClickBuffer`。一次点击始终计入显示池，直到服务端确认；sync 期间数字不再因服务端返回值而回退闪烁。
- 计数器新增指数趋近补间（`requestAnimationFrame` + `displayedValue += diff * 0.2`，约 250ms 到位），连点与他人点赞均平滑滚动上升；首次拿到服务端总数时直接落位、不补间。
- 计数器样式新增 `font-variant-numeric: tabular-nums`，滚动时数字宽度不抖动。
- 标签页隐藏时停止轮询、回到前台时立即刷新并恢复轮询（`visibilitychange`），节省后台请求与数据库读。
- 修复增量轮询竞态：新增 `initialBarrageReady` 标志，初始弹幕拉取完成前不发起 `since` 增量请求，避免 `since=0` 导致的重复弹幕（替代原先脆弱的 1s `setTimeout` 兜底）。
- 输入框 `maxlength` 由 50 调整为 140，与后端一致。
