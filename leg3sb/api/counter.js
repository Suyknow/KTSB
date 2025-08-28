import { MongoClient } from 'mongodb';

// --- CORS 响应头 ---
// 将这些头信息定义在外面，方便复用
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// ... (connectToDatabase 函数保持不变) ...
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  await client.connect();
  const db = client.db('counter_db');
  cachedDb = db;
  return db;
}


const MAX_INCREMENT_ALLOWED = 20;

export default async function handler(req, res) {
  // --- 关键修改：在这里直接处理 OPTIONS 预检请求 ---
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end();
    return;
  }
  // --- 修改结束 ---

  try {
    const db = await connectToDatabase();
    const collection = db.collection('counts');
    const counterId = 'total_shabi_count';

    if (req.method === 'GET') {
      const counterDoc = await collection.findOne({ _id: counterId });
      const count = counterDoc ? counterDoc.value : 0;
      // 为GET请求也加上CORS头
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' }).end(JSON.stringify({ total: count }));
      return;
    }

    if (req.method === 'POST') {
      const { incrementBy } = req.body;

      if (typeof incrementBy !== 'number' || !Number.isInteger(incrementBy) || incrementBy <= 0) {
        res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid increment value. Must be a positive integer.' }));
        return;
      }

      const validatedIncrement = Math.min(incrementBy, MAX_INCREMENT_ALLOWED);

      const result = await collection.findOneAndUpdate(
        { _id: counterId },
        { $inc: { value: validatedIncrement } },
        { upsert: true, returnDocument: 'after' }
      );

      const newTotal = result.value ? result.value.value : validatedIncrement;
      // 为POST成功响应也加上CORS头
      res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' }).end(JSON.stringify({ total: newTotal }));
      return;
    }

    // 对于不支持的方法，也返回CORS头
    res.writeHead(405, CORS_HEADERS).end();

  } catch (error) {
    console.error(error);
    // 对于服务器错误，也返回CORS头
    res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}
