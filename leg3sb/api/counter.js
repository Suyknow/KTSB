const { MongoClient } = require('mongodb');

// 从环境变量获取你的 MongoDB 连接字符串，这是最佳实践
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// 缓存数据库连接，避免每次请求都重新连接
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  await client.connect();
  const db = client.db('counter_db'); // 你可以自定义数据库名
  cachedDb = db;
  return db;
}

// 这是 Serverless Function 的主处理函数
export default async function handler(req, res) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('counts');
    const counterId = 'total_shabi_count'; // 用一个固定的文档ID来存储总数

    // --- 处理 GET 请求：获取当前总数 ---
    if (req.method === 'GET') {
      const counterDoc = await collection.findOne({ _id: counterId });
      // 如果还没有这个文档，就返回0
      const count = counterDoc ? counterDoc.value : 0;
      return res.status(200).json({ total: count });
    }

    // --- 处理 POST 请求：增加计数 ---
    if (req.method === 'POST') {
      // 从请求体中获取要增加的数量
      const { incrementBy } = req.body;
      if (typeof incrementBy !== 'number' || incrementBy <= 0) {
        return res.status(400).json({ error: 'Invalid increment value.' });
      }

      // 使用 findOneAndUpdate 和 $inc 操作符，这是原子操作，能保证数据一致性
      const result = await collection.findOneAndUpdate(
        { _id: counterId },
        { $inc: { value: incrementBy } },
        {
          upsert: true, // 如果文档不存在，就创建它
          returnDocument: 'after' // 返回更新后的文档
        }
      );

      const newTotal = result.value ? result.value.value : incrementBy;
      return res.status(200).json({ total: newTotal });
    }

    // 如果是其他HTTP方法，则不被允许
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
