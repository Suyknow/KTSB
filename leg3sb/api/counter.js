import { getDb } from './_lib/mongo.js';
import { checkClickRateLimit } from './_lib/rateLimit.js';

const MAX_INCREMENT_ALLOWED = 20;
const COUNTER_ID = 'total_shabi_count';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await getDb();
    const collection = db.collection('counts');

    if (req.method === 'GET') {
      const counterDoc = await collection.findOne({ _id: COUNTER_ID });
      const count = counterDoc ? counterDoc.value : 0;
      return res.status(200).json({ total: count });
    }

    if (req.method === 'POST') {
      const { incrementBy, deviceId } = req.body;

      if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ error: 'Device identifier is required.' });
      }

      if (typeof incrementBy !== 'number' || !Number.isInteger(incrementBy) || incrementBy <= 0) {
        return res.status(400).json({ error: 'Invalid increment value. Must be a positive integer.' });
      }

      const rateLimit = await checkClickRateLimit(deviceId);
      if (!rateLimit.allowed) {
        return res.status(429).json({ error: 'Too many click submissions. Please slow down.' });
      }

      const validatedIncrement = Math.min(incrementBy, MAX_INCREMENT_ALLOWED);

      const result = await collection.findOneAndUpdate(
        { _id: COUNTER_ID },
        { $inc: { value: validatedIncrement } },
        { upsert: true, returnDocument: 'after' }
      );

      if (!result) {
        // upsert + returnDocument:'after' should always return the document;
        // this guard is for unexpected database behavior.
        throw new Error('Database operation failed to return the updated document.');
      }

      return res.status(200).json({ total: result.value });
    }

    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('[API_HANDLER_ERROR]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
