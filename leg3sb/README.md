# leg3sb

一个简单的网页，允许用户通过点击和发送弹幕进行互动。

项目Demo地址：[https://leg3sb.ktsb.org](https://leg3sb.ktsb.org)

## 部署

本项目可以轻松地通过 [Vercel](https://vercel.com) 进行部署，并使用 [MongoDB](https://www.mongodb.com) 作为数据库来存储计数和弹幕消息。

在 Vercel 部署项目时，请务必在项目设置中配置以下环境变量：

| 环境变量 | 描述 | 示例值 |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB 数据库连接字符串 | `mongodb+srv://user:password@cluster.mongodb.net/dbname` |
| `MONGODB_DB_NAME` | 可选，数据库名（默认 `counter_db`） | `counter_db` |

## 限制

- 弹幕消息只保留最近 1000 条，超出后自动删除最旧的一条。
- 单条弹幕长度上限 140 字符。
- 点击节流：客户端最小点击间隔 50ms，单次同步最多提交 20 次（每秒不超过 20 次）。
- 点击提交节流：服务端按设备识别码限制，每台设备每秒最多提交一次点击同步。
- 弹幕提交节流：每台设备每秒最多发送一条弹幕（客户端冷却与服务端校验双重限制）。

## 设备识别

节流以**设备识别码**为粒度，而非 IP 地址。这样可避免同一公网 IP 下不同设备被误限。

前端在 `localStorage` 中生成并持久化一个随机设备 ID，随每次提交一并发送；服务端据此在 `rate_limits` 集合中记录每台设备最近一次提交时间，实现按设备节流；超过 1 天未活跃的记录由 TTL 索引自动清理。需注意：设备识别码可被用户清除或伪造，本机制旨在防止一般性滥用，并非针对蓄意攻击的强防护。

## 前端视口方案（iOS Safari）

移动端 iOS 的虚拟键盘只缩小 visual viewport、不动布局视口，且 iOS 26 存在键盘收起后 `visualViewport.offsetTop` 不复位的已知回归。本页采用「resize 驱动」方案，全程零 transform、零 offsetTop 补偿：

- `visualViewport.height` 经纯函数 `public/viewport.js` 计算后写入 `<html>` 的 `--vvh` CSS 变量（仅由 resize 类事件触发）；
- 背景照片独立 `position: fixed; inset: 0` 层，锚定布局视口，任何状态下不移动、不缩放；
- 输入条是 `#app`（高度 = `--vvh`）的流内子元素，键盘弹起时随容器收缩自然贴住键盘上沿；
- 弹幕层高度恒等于「屏幕顶 → 输入条顶」且 `overflow: hidden`，弹幕在结构上不可能出现在输入条之下；
- 捏合与双击缩放在手势层封死（`gesturestart` preventDefault + 双击窗口期 touchend preventDefault），聚焦用 touchstart 预 `focus({preventScroll:true})` 避免 iOS 自动平移视口。

## 自定义

如果您想进行个性化定制，可以 Fork 本仓库，并直接编辑 `public/index.html` 文件：

1.  **替换背景图片**: 在文件中找到背景图片的 URL 并替换为您想要的图片地址。
2.  **替换文字**: 修改文件中的标题和描述等文字内容。
3.  **部署**: 在Vercel中部署，并参考前文，设置`MONGODB_URI`环境变量。

## AI 辅助

### 2025 年初版

* 本项目的前端布局在 **ChatGPT** 的帮助下完成。
* 本项目的后端 Serverless 函数及前端交互脚本，在 **Gemini** 的帮助下完成。

### 2026 年重构

* 计数器同步与补间、共享数据库连接模块、弹幕保留与索引等，在 **opencode**（模型 GLM-5.2）的帮助下完成。
* 前端视口层重构（iOS 键盘适配、弹幕分区、手势锁定，见「前端视口方案」一节）在 **opencode** 的帮助下完成。

## To-Do List

- [x] 增加后端支持，保存全局点击总数；

- [x] 增加前后端数据校验，每次点击间隔不小于50ms，且每秒最多提交20次点击;

- [x] 增加设备识别码节流，每台设备每秒最多提交一次点击同步（改用设备识别码替代 IP，避免同一 NAT 下多设备被误限）；

- [x] 增加弹幕功能支持；

- [x] 弹幕提交频次限制：每台设备每秒最多发送一条弹幕（客户端冷却 + 服务端按设备节流）；

## Licences

除特别声明外，项目仓库内容及相关素材均采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议。
