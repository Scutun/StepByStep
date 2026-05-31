const fs = require('fs')
const path = require('path')
const db = require('../config/db').pool
const tokenUtils = require('../utils/tokens.utils')
const userService = require('../services/users.services')

const LOGS_DIR = path.join(__dirname, '..', 'logs')

async function isAdmin(req) {
    const callerId = tokenUtils.getIdFromToken(req)
    const result = await db.query('SELECT admin FROM users WHERE id = $1', [callerId])
    if (result.rowCount === 0 || !result.rows[0].admin) {
        throw { status: 403, message: 'Доступ запрещен' }
    }
    return callerId
}

class AdminController {
    async deleteUser(req, res, next) {
        try {
            await isAdmin(req)
            const targetId = req.params.id
            await userService.deleteUser(targetId)
            res.status(200).json('Пользователь успешно удален')
        } catch (error) {
            next(error)
        }
    }

    async getLogs(req, res, next) {
        try {
            await isAdmin(req)
            if (!fs.existsSync(LOGS_DIR)) {
                return res.json([])
            }
            const users = fs.readdirSync(LOGS_DIR).filter((name) => name.startsWith('user_'))
            res.json(users)
        } catch (error) {
            next(error)
        }
    }

    async getUserLogs(req, res, next) {
        try {
            await isAdmin(req)
            const userId = req.params.userId
            const userDir = path.join(LOGS_DIR, `user_${userId}`)
            if (!fs.existsSync(userDir)) {
                return res.json([])
            }
            const files = fs.readdirSync(userDir)
            res.json(files)
        } catch (error) {
            next(error)
        }
    }

    async getLogFile(req, res, next) {
        try {
            await isAdmin(req)
            const userId = req.params.userId
            const filename = path.basename(req.params.filename)
            const filePath = path.join(LOGS_DIR, `user_${userId}`, filename)
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'Лог файл не найден' })
            }
            const content = fs.readFileSync(filePath, 'utf8')
            res.type('text/plain').send(content)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new AdminController()
