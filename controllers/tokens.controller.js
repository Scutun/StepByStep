const jwt = require('jsonwebtoken')
const tokenUtils = require('../utils/tokens.utils')

class TokenController {
    async updateRefreshToken(req, res, next) {
        try {
            const refreshToken = req.cookies.refreshToken
            if (refreshToken.length === 0) {
                return res.status(422).json({ message: 'Токен не предоставлен' })
            }

            const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

            await tokenUtils.compareRefreshToken(refreshToken, user.id)

            const newTokens = tokenUtils.genAllTokens(user.id)

            await tokenUtils.saveRefreshToken(user.id, newTokens.refreshToken)

            res.cookie('refreshToken', newTokens.refreshToken, { httpOnly: true, secure: false })
            res.status(201).json({ accessToken: newTokens.accessToken, message: 'Токен обновлен' })
        } catch (error) {
            next({ status: 400, message: `Ошибка при обновлении токена доступа: ${error.message}` })
        }
    }
    async getRefreshToken(req, res, next) {
        try {
            const userId = tokenUtils.getIdFromToken(req)
            const refreshToken = await tokenUtils.getRefreshToken(userId)

            if (!refreshToken) {
                return res.status(404).json({ message: 'Токен не найден или истек' })
            }

            res.status(200).json({ refreshToken })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new TokenController()
