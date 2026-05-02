const Router = require('express')
const router = new Router()

const userController = require('../controllers/users.controllers')
const tokenController = require('../controllers/tokens.controller')
const checkToken = require('../middlewares/checkToken')

router.post('/v1/users/registration', userController.createUser)
router.post('/v1/users/verify/email', checkToken, userController.verifyEmail)
router.post('/v1/users/authorization', userController.loginUser)
router.post('/v1/users/reset/password', userController.resetUserPassword)
router.post('/v1/users/logout', userController.logoutUser)

router.get('/v1/users/new/tokens', tokenController.updateRefreshToken)
router.get('/v1/users/refresh-token', checkToken, tokenController.getRefreshToken)
router.get('/v1/users/me', checkToken, userController.getUser)

router.patch('/v1/users/new/password', checkToken, userController.newUserPassword)

router.put('/v1/users/new/info', checkToken, userController.updateUserInfo)

router.delete('/v1/users', checkToken, userController.deleteUser)

module.exports = router
