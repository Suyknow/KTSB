# Changelog

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## 2026-08-21

### Added

- 新增 `api/_lib/mongo.js`：统一的 MongoDB 连接模块（懒加载 + 全局 Promise 复用，开发环境防热重载重复连接、生产环境复用 serverless 暖实例连接，数据库名从 `MONGODB_DB_NAME` 读取，默认 `counter_db`）。
- `api/counter.js` 与 `api/messages.js` 新增 `OPTIONS` 预检短路，跨域预检不再返回 `405`。
- `api/messages.js` 在 `timestamp` 上建立索引，`since` / `sort` 查询由全表扫描 + 内存排序变为索引扫描。
- 计数器新增指数趋近补间（`requestAnimationFrame` + `displayedValue += diff * 0.2`，约 250ms 到位），连点与他人点赞均平滑滚动上升；首次拿到服务端总数时直接落位、不补间。
- 计数器样式新增 `font-variant-numeric: tabular-nums`，滚动时数字宽度不抖动。
- 标签页隐藏时停止轮询、回到前台立即刷新并恢复轮询（`visibilitychange`），节省后台请求与数据库读。

### Changed

- `api/counter.js` 改用共享连接模块，移除重复连接样板、模块加载期 `throw` 与硬编码的 `"counter_db"`。
- `api/messages.js` 改用共享连接模块；CORS 头交由 `vercel.json` 统一处理。
- 消息保留策略改为「只保留最近 1000 条」：插入后超出阈值即删除最旧一条。
- 单条消息长度上限与输入框 `maxlength` 由 50 调整为 140。
- 计数器重构为三池模型（`confirmedTotal` + `inFlight` + `localClickBuffer`）：一次点击始终计入显示池、直到服务端确认，sync 期间数字不再因服务端返回值而回退。

### Removed

- 移除 `api/messages.js` 中 MongoDB 驱动 v6 已废弃的 `useNewUrlParser` / `useUnifiedTopology` 选项。
- `vercel.json` 移除 `Access-Control-Allow-Credentials: true`（与同文件 `Access-Control-Allow-Origin: *` 冲突，浏览器会拒绝带凭据的通配符源请求，且本项目不使用凭据）。

### Fixed

- 计数器增量轮询竞态：新增 `initialBarrageReady` 标志，初始弹幕拉取完成前不发起 `since` 增量请求，避免 `since=0` 导致的重复弹幕（替代原先脆弱的 1s `setTimeout` 兜底）。
- `public/index.html` `fetchTotalCount`：慢网络 / 冷启动下 GET 可能晚于 POST 返回，陈旧的服务端总数会令 `confirmedTotal` 回退、数字反向跳动。新增 `!isSyncing && data.total >= confirmedTotal` 守卫——服务端总数单调递增，GET 只允许抬高已确认值、永不降低。
- `api/messages.js` `ensureIndexes`：原先 `createIndex` 失败也会置位 `indexesEnsured`，导致该实例后续请求永久跳过建索引、回退全表扫描。改为仅成功后置位，瞬时失败可在后续请求重试。
- `api/messages.js` 消息截断由 `substring(0, 140)`（按 UTF-16 码元）改为 `[...message].slice(0, 140).join('')`（按码点），避免在 emoji / 代理对中间切断产生孤立代理项。
