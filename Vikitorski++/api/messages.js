import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
// 请确保这里的数据库名与您的设置一致
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'counter_db'; 

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  const client = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(MONGODB_DB_NAME);
  cachedDb = db;
  return db;
}

export default async (req, res) => {
  // --- CORS Headers ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  // --- End CORS ---

  const db = await connectToDatabase();
  const collection = db.collection('messages');

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message content is required.' });
      }
      const MAX_MESSAGE_LENGTH = 50; 
      const trimmedMessage = message.substring(0, MAX_MESSAGE_LENGTH).trim();

      await collection.insertOne({
        message: trimmedMessage,
        timestamp: Date.now(),
      });
      res.status(201).json({ success: true });
    } catch (error) {
      console.error('[API_MESSAGES_POST_ERROR]', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } else if (req.method === 'GET') {
    try {
      const { since, limit } = req.query;
      let messages;

      // 如果提供了limit参数，则获取最新的N条
      if (limit) {
        const numLimit = parseInt(limit, 10) || 200; // 默认200
        messages = await collection
          .find()
          .sort({ timestamp: -1 }) // 按时间倒序，获取最新的
          .limit(numLimit)
          .toArray();
        messages.reverse(); // 再反转回来，确保前端接收到的是时间正序
      } 
      // 否则，使用旧的since逻辑，用于实时轮询
      else {
        const sinceTimestamp = parseInt(since || '0', 10);
        messages = await collection
          .find({ timestamp: { $gt: sinceTimestamp } })
          .sort({ timestamp: 1 })
          .limit(100)
          .toArray();
      }

      res.status(200).json({ messages });

    } catch (error) {
      console.error('[API_MESSAGES_GET_ERROR]', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};
