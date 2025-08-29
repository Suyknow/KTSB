# KTSB

## leg3sb 子项目

一个简单的网页，允许用户通过点击和发送弹幕进行互动。

项目Demo地址：[https://leg3sb.ktsb.org](https://leg3sb.ktsb.org)

### 部署

本项目可以轻松地通过 [Vercel](https://vercel.com) 进行部署，并使用 [MongoDB](https://www.mongodb.com) 作为数据库来存储计数和弹幕消息。

在 Vercel 部署项目时，请务必在项目设置中配置以下环境变量：

| 环境变量 | 描述 | 示例值 |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB 数据库连接字符串 | `mongodb+srv://user:password@cluster.mongodb.net/dbname` |

### 自定义

如果您想进行个性化定制，可以 Fork 本仓库，并直接编辑 `index.html` 文件：

1.  **替换背景图片**: 在文件中找到背景图片的 URL 并替换为您想要的图片地址。
2.  **替换文字**: 修改文件中的标题和描述等文字内容。
3.  **部署**: 在Vercel中部署，并参考前文，设置`MONGODB_URI`环境变量。

### AI辅助

* 本项目的前端布局在 **ChatGPT** 的帮助下完成。
* 本项目的后端 Serverless 函数及前端交互脚本，在 **Gemini** 的帮助下完成。
