const Router = require('express')
const router = new Router()

const aiController = require('../controllers/ai.controllers')
const checkToken = require('../middlewares/checkToken')

// Отправить сообщение ИИ-ассистенту
// Body: { message: string, sessionId?: number }
router.post('/v1/ai/chat', checkToken, aiController.sendMessage)

// Получить список сессий текущего пользователя
// Query: { limit?: number, offset?: number }
router.get('/v1/ai/sessions', checkToken, aiController.getSessions)

// Получить историю сообщений сессии
router.get('/v1/ai/sessions/:id', checkToken, aiController.getSessionMessages)

// Удалить сессию
router.delete('/v1/ai/sessions/:id', checkToken, aiController.deleteSession)

module.exports = router
