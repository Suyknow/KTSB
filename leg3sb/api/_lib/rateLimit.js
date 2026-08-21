import { getDb } from './mongo.js';

const RATE_LIMIT_COLLECTION = 'rate_limits';
// 每台设备每秒最多提交一次点击同步
const CLICK_MIN_INTERVAL_MS = 1000;
// 每台设备每秒最多发送一条弹幕
const MESSAGE_MIN_INTERVAL_MS = 1000;
const MAX_DEVICE_ID_LENGTH = 128;
// 设备节流记录的保留期：超过 1 天未活跃即由 TTL 自动清理，避免集合无限增长
const TTL_SECONDS = 86400;

let ttlIndexEnsured = false;

async function ensureTTLIndex(collection) {
  if (ttlIndexEnsured) return;
  try {
    await collection.createIndex({ lastSeen: 1 }, { expireAfterSeconds: TTL_SECONDS });
    ttlIndexEnsured = true;
  } catch (error) {
    console.error('[RATE_LIMIT_TTL_INDEX_ERROR]', error);
  }
}

async function checkRateLimit(deviceId, field, minIntervalMs) {
  if (typeof deviceId !== 'string' || deviceId.length === 0 || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    return { allowed: false };
  }
  const db = await getDb();
  const collection = db.collection(RATE_LIMIT_COLLECTION);
  await ensureTTLIndex(collection);
  const now = Date.now();
  // 记录已存在：仅当间隔已过时才原子地更新并放行
  const result = await collection.updateOne(
    {
      _id: deviceId,
      $or: [{ [field]: { $exists: false } }, { [field]: { $lte: now - minIntervalMs } }],
    },
    { $set: { [field]: now, lastSeen: new Date(now) } }
  );
  if (result.matchedCount === 1) {
    return { allowed: true };
  }
  // 无匹配：可能是首次请求（记录不存在），也可能是间隔未到。
  // 尝试插入以区分两者；并发冲突（E11000）说明记录已存在 → 拒绝。
  try {
    await collection.insertOne({ _id: deviceId, [field]: now, lastSeen: new Date(now) });
    return { allowed: true };
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  return { allowed: false };
}

export function checkClickRateLimit(deviceId) {
  return checkRateLimit(deviceId, 'clickAt', CLICK_MIN_INTERVAL_MS);
}

export function checkMessageRateLimit(deviceId) {
  return checkRateLimit(deviceId, 'messageAt', MESSAGE_MIN_INTERVAL_MS);
}
