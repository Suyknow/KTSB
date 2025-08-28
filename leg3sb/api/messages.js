import { MongoClient } from 'mongodb';

// MongoDB连接URL和数据库名
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = 'mydatabase'; // 替换为您的数据库名称

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
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
  res.setHeader('Access-Control-Allow-Origin', '*'); // 允许所有来源，生产环境应限制为您的域名
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS请求（CORS预检）
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }

  const db = await connectToDatabase();
  const collection = db.collection('messages'); // 新的集合用于存储弹幕

  if (req.method === 'POST') {
    // 处理发送弹幕
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message content is required.' });
      }

      // 限制消息长度，防止过长内容占用过多资源
      const MAX_MESSAGE_LENGTH = 50; 
      const trimmedMessage = message.substring(0, MAX_MESSAGE_LENGTH).trim();

      const result = await collection.insertOne({
        message: trimmedMessage,
        timestamp: Date.now(),
      });

      res.status(201).json({ success: true, messageId: result.insertedId });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } else if (req.method === 'GET') {
    // 处理获取弹幕
    try {
      const sinceTimestamp = parseInt(req.query.since || '0', 10);
      const query = { timestamp: { $gt: sinceTimestamp } };

      // 默认获取过去30秒的弹幕，或从指定时间戳开始的弹幕
      const messages = await collection
        .find(query)
        .sort({ timestamp: 1 }) // 按时间升序
        .limit(100) // 限制每次获取的弹幕数量，防止过大数据量
        .toArray();

      res.status(200).json({ success: true, messages: messages.map(m => ({ message: m.message, timestamp: m.timestamp })) });

    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
};
