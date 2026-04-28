const { Pool } = require('pg')
const { createClient } = require('redis')
const { MongoClient } = require('mongodb')
require('dotenv').config()

// Подключение к PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
})

// Подключение к Redis
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        keepAlive: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
})

redisClient.on('error', () => {})

redisClient.connect().catch(console.error)

// Подключение к MongoDB
const mongoClient = new MongoClient(process.env.MONGO_URI)

let mongoDb

const connectMongoDB = async () => {
    try {
        await mongoClient.connect()
        mongoDb = mongoClient.db(process.env.MONGO_DB_NAME)
    } catch (error) {
        console.error('Ошибка подключения к MongoDB:', error)
    }
    return mongoDb
}

connectMongoDB()

// Закрытие подключений при завершении работы
const shutdown = async () => {
    console.log('Закрытие соединений...')
    await pool.end()
    await redisClient.quit()
    await mongoClient.close()
    console.log('Все соединения закрыты. Завершение работы.')
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

module.exports = { pool, redisClient, mongoDb, connectMongoDB }
