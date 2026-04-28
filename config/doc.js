const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const glob = require('glob')

const docsPath = path.join(__dirname, '../docs')
const outputPath = path.join(docsPath, 'main.swagger.yaml')

const swaggerFiles = glob
    .sync(path.join(docsPath, '*.swagger.yaml'))
    .filter((file) => !file.includes('main.swagger.yaml'))

console.log('Найдены файлы для объединения:', swaggerFiles)

const mergedData = {
    openapi: '3.0.0',
    info: {
        title: 'StepByStep API',
        version: '1.0.0',
        description: 'API образовательной платформы по программированию',
    },
    servers: [
        {
            url: '/api',
            description: 'Текущий хост (через префикс /api)',
        },
    ],
    tags: [
        { name: 'Users', description: 'Регистрация, авторизация и профиль пользователя' },
        { name: 'Courses', description: 'Курсы, подписки на курсы' },
        { name: 'Sections', description: 'Разделы курса' },
        { name: 'Lessons', description: 'Уроки внутри раздела' },
        { name: 'Tests', description: 'Тесты внутри раздела' },
        { name: 'Reviews', description: 'Отзывы на курс' },
        { name: 'Photos', description: 'Аватары и обложки курсов' },
        { name: 'Tags', description: 'Теги курсов' },
        { name: 'Difficulties', description: 'Уровни сложности курсов' },
        { name: 'AI Assistant', description: 'Чат с ИИ-ассистентом' },
    ],
    paths: {},
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            CookieAuth: {
                type: 'apiKey',
                in: 'cookie',
                name: 'refreshToken',
            },
        },
        schemas: {},
    },
}

swaggerFiles.forEach((file) => {
    try {
        const content = yaml.load(fs.readFileSync(file, 'utf8'))

        if (content.paths) {
            Object.assign(mergedData.paths, content.paths)
        }

        if (content.components) {
            if (content.components.schemas) {
                Object.assign(mergedData.components.schemas, content.components.schemas)
            }
            if (content.components.securitySchemes) {
                Object.assign(
                    mergedData.components.securitySchemes,
                    content.components.securitySchemes,
                )
            }
        }

        console.log(`Объединён: ${file}`)
    } catch (error) {
        console.error(`Ошибка при обработке файла: ${file}`, error)
    }
})

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']

for (const pathItem of Object.values(mergedData.paths)) {
    for (const method of HTTP_METHODS) {
        const op = pathItem[method]
        if (!op || !Array.isArray(op.parameters)) continue

        let usesBearer = false
        let usesCookie = false

        op.parameters = op.parameters.filter((param) => {
            if (!param || param.name !== 'Authorization') return true

            const where = String(param.in || '').toLowerCase()
            if (where === 'header') {
                usesBearer = true
                return false
            }
            if (where === 'cookie' || where === 'cookies') {
                usesCookie = true
                return false
            }
            return true
        })

        if (op.parameters.length === 0) delete op.parameters

        if (usesBearer || usesCookie) {
            const security = []
            if (usesBearer) security.push({ BearerAuth: [] })
            if (usesCookie) security.push({ CookieAuth: [] })
            op.security = security
        }
    }
}

fs.writeFileSync(outputPath, yaml.dump(mergedData, { lineWidth: 120 }), 'utf8')
console.log(`Файл успешно объединён: ${outputPath}`)
