import {CacheContainer} from "node-ts-cache"
import {IoRedisStorage} from "node-ts-cache-storage-ioredis"
import {MemoryStorage} from "node-ts-cache-storage-memory"
import IoRedis from "ioredis"

let redisPort = 6379
if (process.env.REDIS_PORT) {
  redisPort = parseInt(process.env.REDIS_PORT)
}
const redisHost = process.env.REDIS_HOST

console.log(`Redis host:${redisHost}, port:${redisPort}`)

let cacheContainer: CacheContainer | undefined
if (redisHost) {
  const ioRedisInstance = new IoRedis({
    host: redisHost,
    port: redisPort,
    password: process.env.REDIS_PASSWORD,
  })
  cacheContainer = new CacheContainer(new IoRedisStorage(ioRedisInstance))
} else {
  cacheContainer = new CacheContainer(new MemoryStorage())
}

export default cacheContainer
