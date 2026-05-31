const Router = require('express')
const router = new Router()

const adminController = require('../controllers/admin.controllers')
const checkToken = require('../middlewares/checkToken')

router.delete('/v1/admin/users/:id', checkToken, adminController.deleteUser)

router.get('/v1/admin/logs', checkToken, adminController.getLogs)
router.get('/v1/admin/logs/:userId', checkToken, adminController.getUserLogs)
router.get('/v1/admin/logs/:userId/:filename', checkToken, adminController.getLogFile)

module.exports = router
