const jwt = require('jsonwebtoken')
const redis = require('../config/db').redisClient

function getIdFromToken(req) {
    try {
        const authHeaders = req.headers.authorization
        const token = authHeaders && authHeaders.split(' ')[1]

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        return decoded.id
    } catch (error) {
        throw { status: 401, message: 'Недействительный токен' }
    }
}

function genAccessToken(id) {
    const accessToken = jwt.sign({ id: id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_LIFE,
    })
    return accessToken
}

function genAllTokens(id) {
    const accessToken = jwt.sign({ id: id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_LIFE,
    })
    const refreshToken = jwt.sign({ id: id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_LIFE,
    })
    return { accessToken, refreshToken }
}

async function saveRefreshToken(id, refreshToken) {
    try {
        await redis.setEx(`user_id:${id}`, 1209600, refreshToken)
    } catch (error) {
        throw { status: 500, message: `Ошибка при сохранении токена: ${error.message}` }
    }
}

async function compareRefreshToken(refreshToken, id) {
    try {
        const storedRefreshToken = await redis.get(`user_id:${id}`)

        if (storedRefreshToken && storedRefreshToken === refreshToken) {
            return
        } else {
            throw { status: 401, message: 'Неправильный токен обновления ' }
        }
    } catch (error) {
        if (error.status) throw error
        throw { status: 500, message: `Ошибка при проверке токена обновления: ${error.message}` }
    }
}

async function getRefreshToken(id) {
    try {
        return await redis.get(`user_id:${id}`)
    } catch (error) {
        throw { status: 500, message: `Ошибка при получении токена обновления: ${error.message}` }
    }
}

async function deleteRefreshToken(id) {
    try {
        await redis.del(`user_id:${id}`)
    } catch (error) {
        throw { status: 500, message: `Ошибка при удалении токена обновления: ${error.message}` }
    }
}

module.exports = {
    genAllTokens,
    genAccessToken,
    saveRefreshToken,
    compareRefreshToken,
    getIdFromToken,
    deleteRefreshToken,
    getRefreshToken,
}
