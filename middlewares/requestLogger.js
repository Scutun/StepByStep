const jwt = require('jsonwebtoken')
const { logRequest } = require('../utils/logger.utils')

function extractUserId(req) {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader) return null
        const token = authHeader.split(' ')[1]
        if (!token) return null
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        return decoded.id
    } catch {
        return null
    }
}

function requestLogger(req, res, next) {
    const startTime = Date.now()

    res.on('finish', () => {
        try {
            const userId = extractUserId(req) ?? 'anonymous'
            const duration = Date.now() - startTime
            const errorCode = res.locals.errorCode ?? null
            const errorMessage = res.locals.errorMessage ?? null

            logRequest(userId, req.method, req.path, res.statusCode, duration, errorCode, errorMessage)
        } catch (err) {
            console.error('Request logger middleware error:', err.message)
        }
    })

    next()
}

module.exports = requestLogger
