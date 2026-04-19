function errorHandler(err, req, res, next) {
    const response = {
        status: err.status || 500,
        message: err.message || 'Внутренняя ошибка сервера',
    }
    if (err.code) {
        response.code = err.code
    }

    res.locals.errorCode = err.code || null
    res.locals.errorMessage = err.message || null

    res.status(err.status || 500).json(response)
}

module.exports = errorHandler
