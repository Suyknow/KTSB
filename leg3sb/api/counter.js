import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  await client.connect();
  const db = client.db('counter_db');
  cachedDb = db;
  return db;
}

// --- 新增：在这里定义权威的规则 ---
const MAX_INCREMENT_ALLOWED = 20;

export default async function handler(req, res) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('counts');
    const counterId = 'total_shabi_count';

    if (req.method === 'GET') {
      const counterDoc = await collection.findOne({ _id: counterId });
      const count = counterDoc ? counterDoc.value : 0;
      return res.status(200).json({ total: count });
    }

    if (req.method === 'POST') {
      const { incrementBy } = req.body;

      // --- 关键修改：服务器端验证 START ---
      
      // 1. 验证类型是否为正整数
      if (typeof incrementBy !== 'number' || !Number.isInteger(incrementBy) || incrementBy <= 0) {
        return res.status(400).json({ error: 'Invalid increment value. Must be a positive integer.' });
      }

      // 2. 强制将传入值限制在我们的上限之内
      // 无论前端传来100还是10000，我们都只按 MAX_INCREMENT_ALLOWED (20) 来处理
      const validatedIncrement = Math.min(incrementBy, MAX_INCREMENT_ALLOWED);

      // --- 关键修改：服务器端验证 END ---

      const result = await collection.findOneAndUpdate(
        { _id: counterId },
        // 使用经过验证和修正后的值来更新数据库
        { $inc: { value: validatedIncrement } },
        {
          upsert: true,
          returnDocument: 'after'
        }
      );

      const newTotal = result.value ? result.value.value : validatedIncrement;
      return res.status(200).json({ total: newTotal });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
