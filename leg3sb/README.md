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

## To-Do List

- [x] 增加后端支持，保存全局点击总数；

- [x] 增加前后端数据校验，每次点击间隔不小于50ms，且每秒最多提交20次点击;

- [ ] 增加IP地址校验，每个IP每秒最多执行一次提交；

- [x] 增加弹幕功能支持；

- [ ] 弹幕提交频次限制和IP地址校验；

## Licences

除特别声明外，项目仓库内容及相关素材均采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议。
