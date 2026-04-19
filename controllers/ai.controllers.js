const aiService = require('../services/ai.services')
const tokenUtils = require('../utils/tokens.utils')

class AiController {
    async sendMessage(req, res, next) {
        try {
            const userId = tokenUtils.getIdFromToken(req)
            const { message, sessionId } = req.body

            console.log(`[AI] Запрос от пользователя ${userId} | sessionId: ${sessionId || 'новая'} | длина: ${message?.length || 0}`)

            const result = await aiService.sendMessage(userId, message, sessionId)

            console.log(`[AI] Ответ успешно сформирован | sessionId: ${result.sessionId}`)

            res.json(result)
        } catch (error) {
            console.error(`[AI] Ошибка обработки запроса: ${error.code || error.status} — ${error.message}`)
            next(error)
        }
    }

    async getSessions(req, res, next) {
        try {
            const userId = tokenUtils.getIdFromToken(req)
            const result = await aiService.getUserSessions(userId, req.query)
            res.json(result)
        } catch (error) {
            next(error)
        }
    }

    async getSessionMessages(req, res, next) {
        try {
            const userId = tokenUtils.getIdFromToken(req)
            const result = await aiService.getSessionMessages(userId, req.params.id)
            res.json(result)
        } catch (error) {
            next(error)
        }
    }

    async deleteSession(req, res, next) {
        try {
            const userId = tokenUtils.getIdFromToken(req)
            await aiService.deleteSession(userId, req.params.id)
            res.json({ message: 'Сессия удалена' })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new AiController()
