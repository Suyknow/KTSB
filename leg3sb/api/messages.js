import { getDb } from './_lib/mongo.js';

const MAX_MESSAGES = 1000;
const MAX_MESSAGE_LENGTH = 140;

let indexesEnsured = false;

async function ensureIndexes(collection) {
  if (indexesEnsured) return;
  try {
    await collection.createIndex({ timestamp: 1 });
  } catch (error) {
    console.error('[API_MESSAGES_INDEX_ERROR]', error);
  }
  indexesEnsured = true;
}

export default async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await getDb();
    const collection = db.collection('messages');
    await ensureIndexes(collection);

    if (req.method === 'POST') {
      const { message } = req.body;

      if (typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Message content is required.' });
      }

      const trimmedMessage = message.substring(0, MAX_MESSAGE_LENGTH).trim();
      if (!trimmedMessage) {
        return res.status(400).json({ success: false, error: 'Message content is required.' });
      }

      await collection.insertOne({
        message: trimmedMessage,
        timestamp: Date.now(),
      });

      // 只保留最近 MAX_MESSAGES 条：超出时删除最旧的一条
      const count = await collection.countDocuments();
      if (count > MAX_MESSAGES) {
        await collection.findOneAndDelete({}, { sort: { timestamp: 1 } });
      }

      return res.status(201).json({ success: true });
    }

    if (req.method === 'GET') {
      const { since, limit } = req.query;
      let messages;

      // 提供 limit 时获取最新的 N 条，反转后按时间正序返回
      if (limit) {
        const numLimit = parseInt(limit, 10) || 200;
        messages = await collection
          .find()
          .sort({ timestamp: -1 })
          .limit(numLimit)
          .toArray();
        messages.reverse();
      } else {
        // 否则使用 since 增量轮询：返回比 since 更新的消息
        const sinceTimestamp = parseInt(since || '0', 10);
        messages = await collection
          .find({ timestamp: { $gt: sinceTimestamp } })
          .sort({ timestamp: 1 })
          .limit(100)
          .toArray();
      }

      return res.status(200).json({ messages });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('[API_MESSAGES_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
