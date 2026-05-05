require('dotenv').config()
const bcrypt = require('bcrypt')
const modelUser = require('../models/users.models')
const tokenUtils = require('../utils/tokens.utils')
const jwt = require('jsonwebtoken')

class UsersService {
    async createUser(userInfo) {
        try {
            const { email, password, login, name, surname } = userInfo

            if (
                email.length === 0 ||
                password.length === 0 ||
                login.length === 0 ||
                name.length === 0 ||
                surname.length === 0
            ) {
                throw { status: 422, message: 'Все поля обязательны для заполнения' }
            }

            const hashPassword = await bcrypt.hash(password, Number(process.env.HASH_SALT))
            const date = new Date().toISOString().split('T')[0]
            const info = { email, hashPassword, login, name, surname, date }

            return await modelUser.newUser(info)
        } catch (error) {
            throw error
        }
    }

    async searchUsers(email, login) {
        try {
            if (email.length === 0 || login.length === 0) {
                throw { status: 422, message: 'Необходимо передать e-mail или логин' }
            }

            const users = await modelUser.searchUsers(email, login)

            if (users.rowCount > 0) {
                throw {
                    status: 409,
                    message: `Этот ${users.rows[0].email === email ? 'e-mail уже занят' : 'логин уже занят'}`,
                }
            }
        } catch (error) {
            throw error
        }
    }

    async loginUser(info) {
        try {
            const { email, password } = info

            if (email.length === 0 || password.length === 0) {
                throw { status: 422, message: 'E-mail и пароль обязательны' }
            }

            const user = await modelUser.loginUser(email)

            if (user.rowCount === 0) {
                throw { status: 404, message: 'Пользователь не найден' }
            } else if (user.rows[0].activated == false) {
                throw { status: 403, message: 'Пользователь не подтвердил почту' }
            }
            if (!(await bcrypt.compare(password, user.rows[0].password))) {
                throw { status: 401, message: 'Неправильный пароль' }
            }

            return user.rows[0].id
        } catch (error) {
            throw error
        }
    }

    async activateUser(email) {
        try {
            if (email.length === 0) {
                throw { status: 422, message: 'E-mail обязателен' }
            }

            const user = await modelUser.activateUser(email)

            return user[0].id
        } catch (error) {
            throw error
        }
    }

    async resetUserPassword(info) {
        try {
            if (info.email.length === 0) {
                throw { status: 422, message: 'E-mail обязателен' }
            }

            const user = await modelUser.loginUser(info.email)

            if (user.rowCount === 0) {
                throw { status: 404, message: 'Пользователь не найдеть' }
            } else if (user.rows[0].activated === false) {
                throw { status: 403, message: 'Пользователь не подтвердил почту' }
            }
            return user.rows[0].id
        } catch (error) {
            throw error
        }
    }

    async newUserPassword(id, password) {
        try {
            if (password.length === 0) {
                throw { status: 422, message: 'Новый пароль обязателен' }
            }

            const hashPassword = await bcrypt.hash(password, 10)

            await modelUser.updateUserPassword(id, hashPassword)
        } catch (error) {
            throw error
        }
    }

    async getUser(id) {
        try {
            const user = await modelUser.getUser(id)

            if (user.rowCount === 0) {
                throw { status: 404, message: 'Пользователь не найден' }
            }

            return user.rows[0]
        } catch (error) {
            throw error
        }
    }

    async updateUserInfo(id, info) {
        try {
            if (
                info.name.length === 0 ||
                info.surname.length === 0 ||
                info.nickname.length === 0 ||
                info.photo.length === 0
            ) {
                throw { status: 400, message: 'Неверные значения были переданы' }
            }

            const user = await modelUser.getUser(id)

            if (user.rowCount === 0) {
                throw { status: 404, message: 'Пользователь не найден' }
            }

            const newInfo = await modelUser.updateUserInfo(id, info)

            return newInfo
        } catch (error) {
            throw error
        }
    }

    async deleteUser(id) {
        try {
            const user = await modelUser.getUser(id)

            if (user.rowCount === 0) {
                throw { status: 404, message: 'Пользователь не найден' }
            }

            await modelUser.deleteUser(id)
            tokenUtils.deleteRefreshToken(id)

            return
        } catch (error) {
            throw error
        }
    }
}

module.exports = new UsersService()
