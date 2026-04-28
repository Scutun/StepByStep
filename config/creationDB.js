require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const defaultConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
}

const sqlFilePath = path.join(__dirname, 'database.sql')
const sqlScript = fs.readFileSync(sqlFilePath, 'utf-8')

const dbName = process.env.DB_NAME || 'stepbystep'

const createDatabase = async () => {
    const defaultPool = new Pool({
        ...defaultConfig,
        database: 'postgres',
    })

    try {
        await defaultPool.query(`CREATE DATABASE ${dbName}`)
        console.log(`База данных ${dbName} успешно создана!`)
    } catch (error) {
        if (error.code === '42P04') {
            console.log(`База данных ${dbName} уже существует.`)
        } else {
            console.error('Ошибка при создании базы данных:', error.message)
        }
    } finally {
        await defaultPool.end()
    }
}

const createTables = async () => {
    const airplanePool = new Pool({
        ...defaultConfig,
        database: dbName,
    })

    try {
        await airplanePool.query(sqlScript)
        console.log('Таблицы успешно созданы!')
    } catch (error) {
        console.error('Ошибка при создании таблиц:', error.message)
    } finally {
        await airplanePool.end()
    }
}

const initDatabase = async () => {
    try {
        await createDatabase()
        await createTables()
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error.message)
    } finally {
        console.log('Закрытие всех соединений...')
        process.exit(0) // Завершаем процесс после выполнения всех операций
    }
}

initDatabase()
