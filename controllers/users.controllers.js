const jwt = require('jsonwebtoken')
const userService = require('../services/users.services')
const tokenUtils = require('../utils/tokens.utils')
const emailUtils = require('../utils/emails.utils')

class UsersController {
    async createUser(req, res, next) {
        try {
            await userService.searchUsers(req.body.email, req.body.login)

            const emailToken = tokenUtils.genAccessToken(req.body.email)

            await emailUtils.sendVerificationEmail(req.body.email, emailToken)
            await userService.createUser(req.body)

            res.status(201).json({ message: 'Письмо отправлено на почту' })
        } catch (error) {
            next(error)
        }
    }

    async loginUser(req, res, next) {
        try {
            const id = await userService.loginUser(req.body)
            const newTokens = tokenUtils.genAllTokens(id)

            await tokenUtils.saveRefreshToken(id, newTokens.refreshToken)

            res.cookie('refreshToken', newTokens.refreshToken, { httpOnly: true, secure: false })
            res.status(201).json({
                accessToken: newTokens.accessToken,
                message: 'Пользователь авторизован',
            })
        } catch (error) {
            next(error)
        }
    }

    async resetUserPassword(req, res, next) {
        try {
            const user = await userService.resetUserPassword(req.body)
            const emailToken = tokenUtils.genAccessToken(user)

            await emailUtils.sendResetPasswordEmail(req.body.email, emailToken)

            res.status(201).json({ message: 'Письмо отправлено на почту' })
        } catch (error) {
            next(error)
        }
    }

    async verifyEmail(req, res, next) {
        try {
            const user = tokenUtils.getIdFromToken(req)

            const newUser = await userService.activateUser(user)

            const newTokens = tokenUtils.genAllTokens(newUser)

            res.cookie('refreshToken', newTokens.refreshToken, { httpOnly: true, secure: false })
            res.status(201).json({
                accessToken: newTokens.accessToken,
                message: 'Пользователь зарегистрован',
            })
        } catch (error) {
            next(error)
        }
    }

    async newUserPassword(req, res, next) {
        try {
            const id = tokenUtils.getIdFromToken(req)

            await userService.newUserPassword(id, req.body.password)

            res.status(202).json({ message: 'Пароль успешно обновлен' })
        } catch (error) {
            next(error)
        }
    }

    async logoutUser(req, res, next) {
        try {
            const refreshToken = req.cookies.refreshToken
            if (!refreshToken) {
                return res.status(422).json({ message: 'Токен не предоставлен' })
            }

            const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

            await tokenUtils.deleteRefreshToken(user.id)

            res.clearCookie('refreshToken', { httpOnly: true, secure: false })
            res.status(200).json('User logged out')
        } catch (error) {
            next(error)
        }
    }

    async getUser(req, res, next) {
        try {
            const id = tokenUtils.getIdFromToken(req)

            const user = await userService.getUser(id)
            res.json(user)
        } catch (error) {
            next(error)
        }
    }

    async updateUserInfo(req, res, next) {
        try {
            const id = tokenUtils.getIdFromToken(req)

            const user = await userService.updateUserInfo(id, req.body)
            res.json(user)
        } catch (error) {
            next(error)
        }
    }

    async deleteUser(req, res, next) {
        try {
            const id = tokenUtils.getIdFromToken(req)

            await userService.deleteUser(id)

            res.status(200).json('Пользователь успешно удален')
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new UsersController()
