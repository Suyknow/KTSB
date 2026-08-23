# Changelog

## 2026-08-23

### Changed（显示层完全重构）

- **彻底重构视口方案为「resize 驱动」**，废弃全部 transform / offsetTop 追逐实现（调研结论：MDN device-fixed 示例自述滚动时会闪烁；Apple 论坛 #800125/#800154 确认 iOS 26 存在键盘收起后 `offsetTop` 不复位的回归 bug；社区成熟方案 gavalierm/ios-pwa-scrolling-input-focus-fix 亦采用 CSS 变量 + 仅响应 resize 的路线）。新分层：
  - `#bg` 背景照片独立 `fixed; inset:0`——锚定布局视口（iOS 键盘期不变），**图片永不移动/缩放**；
  - `--vvh`（= `visualViewport.height`）仅由 resize 类事件写入 `<html>`，`#app` 高度随之缩放，**输入条作为流内子元素自然贴住键盘上沿**，无 transform、无 rAF 跟踪循环；
  - `#under-cover` 纯黑盖板从 `top: var(--vvh)` 盖到屏幕底，键盘动画间隙 / iOS 26 迷你 tab 区任何露缝处均为纯黑（输入框以下无内容）；
  - `#barrage-layer` 高度恒等于「屏顶→输入条顶」且 `overflow:hidden`，**弹幕在结构上不可能出现在输入条/键盘之下**（不再依赖 JS 坐标计算）。
- **双击/捏合缩放从触发源头封死**：meta 加 `maximum-scale=1`、全局 `gesturestart/change/end` preventDefault（iOS 捏合专用通道）、第二次 touchend 落入 350ms 窗口即 preventDefault 使双击缩放手势根本不合成（计数走 pointerdown 不受影响、输入区放行）；残留 scale≠1 / offsetTop≠0 由 `syncViewport` 兜底复位。修复双击后键盘与输入条间隙变透明、背景图轻微缩放位移的问题。
- 聚焦改用 touchstart 捕获阶段预 `focus({preventScroll:true})`（社区验证方案）：元素已聚焦则 iOS 跳过「滚入可见区」自动平移，从源头杜绝键盘期 VV pan；后台切换时先 blur 再复位，防快照恢复错乱。
- `viewport.js` 契约重写为 `computeViewportLayout(vv, fallbackHeight) → { appHeight, needsPanReset }`；单测同步重写（8 例）。

### Fixed

- 修复聚焦输入框时整页以帧频抽搐（真机遥测定位）：页面处于轻微缩放（`vv.scale≈1.08`，布局视口 775 与 `vv.height` 718 间有 57px pan 余量）时，iOS 为露出聚焦输入框把 VV pan 到 `offsetTop=57`（并反映进 `scrollY`），而 `syncViewport` 末尾的 `window.scrollTo(0,0)` 兜底立即把它拽回 0——两个控制器逐帧争夺 pan 位置，`offsetTop` 以 0↔57 帧频翻转，表现为整页抖动。移除该 scrollTo 干预（device-fixed 公式对任意 `offsetTop` 自洽，无需归零）；`syncViewport` 的两处 transform 写入加脏检查，值不变不写 style，消除 rAF 逐帧赋值造成的无谓样式失效。此前 CDP mock 验证未覆盖此路径，因 mock 的 scale 恒为 1、不存在 pan 余量。

### Removed

- 移除全部开发期产物：`test/`（单测）、`eslint.config.js`、ESLint devDependencies（`package.json` 仅保留运行时依赖 `mongodb` 并重新生成 lockfile）、`node_modules/`、开发用遥测页 `public/debug.html`（其 `/log` 上报端点生产环境不存在）及 `.DS_Store`。`.vercelignore` 同步精简；README 增补「前端视口方案」一节说明现行架构。
- 清理 `index.html` 中未使用的 `bgEl` / `appEl` 引用（代码审查发现）。

## 2026-08-22

### Fixed

- 重做 iOS 键盘弹起时的视觉视口处理（真机录屏复现：键盘一弹出整页被推上、页面可被手指滑动、输入条掉到键盘后消失、底部露白）。旧契约 `inputBarBottom = innerHeight − vv.height` 依赖 `innerHeight` 行为与 VV 事件时序假设，真机上不成立。改为 **body 镜像 visual viewport**：`computeViewportLayout(vv)` 返回 `{ bodyTransformY: vv.offsetTop, bodyHeight: vv.height }`，body 矩形逐帧等于屏幕可见矩形——背景铺满不露白、平移被 transform 逐帧抵消（页面钉死不可滑）、iOS「把聚焦输入框滚进可见区」的上推因输入框始终可见而不再触发，与 `innerHeight` 完全解耦。
- 修复键盘升起第一阶段（`visualViewport` 已缩高、`offsetTop` 尚为 0）输入条掉到键盘后的缺陷：`.counter` 与 `.message-input-area` 由 `position: fixed` 改为 `absolute`。fixed 元素的包含块随 body 是否带 transform 在 viewport/body 之间漂移——transform 只在 `offsetTop≠0` 时才设置，导致键盘弹出初期（无 transform）输入条仍钉在视口底、被键盘完全盖住，iOS 为寻找这个视口外元素持续上推页面；真机表现为「键盘一弹整页被推上、输入条消失数秒」。改 absolute 后恒以全屏容器 body 定位，任何阶段都贴可见区底/顶。
- 新增键盘在场期间的 rAF 逐帧跟踪（`focus` 启动 / `blur` 停止并兜底一次）：WebKit 的 `visualViewport` 事件在键盘动画与手指 pan 期间可能不连续触发，仅靠事件驱动会滞后。
- 移除捏合缩放（`vv.scale ≠ 1`）时的回退清空：镜像几何对任意缩放倍数都成立，且 WebKit 键盘动画期间会瞬时抖动 scale，守卫误触发会造成可见跳变。
- `html` 增加黑色背景兜底：过冲/事件间隙即使露出 body 绘制区之外也显示黑底而非白底。
- 以上已用 Chrome CDP + 注入 mock visualViewport 的完整事件序列（键盘升起、iOS 平移、手指过冲、收起动画、scale 抖动、聚焦期 rAF 兜底）做端到端验证，21 项断言全部通过。

### Changed

- `public/viewport.js` 契约变更：`computeViewportLayout(vv)` 不再接收 `innerHeight`、不再返回 `inputBarBottom`，改为返回 `bodyHeight`（`null` 表示无 VV API 时用 CSS 默认高度）；`test/viewport.test.js` 同步重写，锁定「body 底 == VV 底（键盘上沿）」不变量。

## 2026-08-22（早先）

### Fixed

- 修复 iOS Safari 聚焦底部输入框时整页上移、露白底、输入条悬空 / 与键盘附件栏重叠的问题。根因是 iOS 平移的是 **visual viewport**（`offsetTop` 增大，且允许过冲与手指 pan），属 visual viewport 层，`overflow:hidden` / `position:fixed` 只锁 document scroll、管不到它。改为「反向平移抵消」：`visualViewport` 的 `resize`/`scroll` 事件里给 `body` 设 `transform: translateY(offsetTop)`——body 为 `fixed;inset:0` 等于 layout viewport，transform 后 fixed 后代改以 body 为包含块，内容经 `+offsetTop(transform) − offsetTop(VV 平移)` 抵消、视觉钉死，并扩展 body 绘制区覆盖过冲白带；输入条 `bottom = innerHeight − vv.height`（删去 `- vv.offsetTop` 与 `Math.max` 钳位）落在键盘上沿、与 offsetTop 解耦。键盘收起时 `offsetTop` 归 0、`vv.height` 恢复，transform / bottom 自然复位。安卓 Chrome `offsetTop` 恒为 0，transform 为空、行为不变、无退化。
- 修复点击 `+1` 弹幕在键盘弹出时落点偏移（既有缺陷）：`clientY` 按 CSSOM View 规范是 layout-viewport 坐标（这正是 `visualViewport` API 被引入的原因——遗留坐标忽略 VV 偏移）。body 经 `translateY(offsetTop)` 反向平移后，弹幕作为 body 子节点其 `top` 即 screen 坐标，故改用 `clientY − offsetTop` 落在手指点按处；无键盘时 `offsetTop=0`、无副作用。

### Added

- 新增 `public/viewport.js`：纯函数 `computeViewportLayout(vv, innerHeight)`，把「反向平移抵消」的几何计算（`bodyTransformY = vv.offsetTop`、`inputBarBottom = innerHeight − vv.height`）从内联脚本抽出为 ESM，供前端与单测共用同一份几何契约。
- 新增 `test/viewport.test.js`：基于 Node 内置 `node:test`（零依赖）的单测，覆盖无 visualViewport API、键盘未弹出、iOS VV 平移、iOS 过冲露白、安卓 layout 缩短、动画中间态、`vv.height` 异常大等场景，锁定「内容钉死 + 输入条贴键盘 + 不露白」的数学前提。
- 新增 ESLint 9 flat config（`eslint.config.js`）与 `npm run lint` / `npm test` 脚本；lint 范围限定于本次新增的 ESM 文件（`public/**/*.js`、`test/**/*.js`），`index.html` 内联脚本与 `api/*.js` 暂未纳入以避免改动既有可用代码。
- 新增 `.vercelignore`：把 `test/`、`eslint.config.js`、`*.md` 等开发与文档文件排除出 Vercel 部署产物（保留 `package.json` / `package-lock.json` / `vercel.json` / `api/` / `public/`），精简上传、避免 devDeps 干扰安装。

## 2026-08-21

### Added

- 新增 `api/_lib/mongo.js`：统一的 MongoDB 连接模块（懒加载 + 全局 Promise 复用，开发环境防热重载重复连接、生产环境复用 serverless 暖实例连接，数据库名从 `MONGODB_DB_NAME` 读取，默认 `counter_db`）。
- `api/counter.js` 与 `api/messages.js` 新增 `OPTIONS` 预检短路，跨域预检不再返回 `405`。
- `api/messages.js` 在 `timestamp` 上建立索引，`since` / `sort` 查询由全表扫描 + 内存排序变为索引扫描。
- 计数器新增指数趋近补间（`requestAnimationFrame` + `displayedValue += diff * 0.2`，约 250ms 到位），连点与他人点赞均平滑滚动上升；首次拿到服务端总数时直接落位、不补间。
- 计数器样式新增 `font-variant-numeric: tabular-nums`，滚动时数字宽度不抖动。
- 标签页隐藏时停止轮询、回到前台立即刷新并恢复轮询（`visibilitychange`），节省后台请求与数据库读。
- 新增 `api/_lib/rateLimit.js`：按设备识别码节流的共享模块（`checkClickRateLimit` / `checkMessageRateLimit`），记录于 `rate_limits` 集合。
- 新增设备识别码机制：前端在 `localStorage` 生成并持久化随机设备 ID，随点击 / 弹幕提交一并发送；以设备为节流粒度替代 IP，避免校园宿舍等 NAT 场景下多设备被误限。
- 新增点击提交节流：服务端每台设备每秒最多一次点击同步，超频返回 `429`，客户端自动回退待下一轮重试、点击不丢失。
- 新增弹幕提交节流：每台设备每秒最多一条弹幕，客户端冷却（`MESSAGE_COOLDOWN_MS`）与服务端校验双重限制。
- `rate_limits` 集合新增 `lastSeen` 字段及 TTL 索引（1 天未活跃自动清理），避免设备识别码被频繁重生导致集合无限增长。

### Changed

- `api/counter.js` 与 `api/messages.js` 在 POST 处理中读取 `deviceId` 并调用节流模块；缺设备 ID 返回 `400`、超频返回 `429`。
- `public/index.html` 点击 / 弹幕 POST 请求体新增 `deviceId` 字段；弹幕发送新增客户端冷却，冷却期内发送按钮禁用。

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
