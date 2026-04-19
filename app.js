require('dotenv').config()
require('./config/db')

const express = require('express')
const app = express()
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const PORT = process.env.PORT || 3020
const cookieParser = require('cookie-parser')
const errorHandler = require('./middlewares/errorHandler')
const requestLogger = require('./middlewares/requestLogger')

const userRoutes = require('./routes/users.routes')
const courseRoutes = require('./routes/courses.routes')
const reviewRoutes = require('./routes/reviews.routes')
const sectionRoutes = require('./routes/sections.routes')
const photosRoutes = require('./routes/photos.routes')
const testsRoutes = require('./routes/tests.routes')
const lessonsRoutes = require('./routes/lessons.routes')
const additionsRoutes = require('./routes/additions.routes')
const aiRoutes = require('./routes/ai.routes')

app.use(cookieParser())
app.use(express.json())
app.use(cors())
app.use(requestLogger)

const swaggerMain = yaml.load(fs.readFileSync('./docs/main.swagger.yaml', 'utf8'))

app.use('/api/v1/swagger/docs', swaggerUi.serve, swaggerUi.setup(swaggerMain))

app.use('/api', userRoutes)
app.use('/api', courseRoutes)
app.use('/api', reviewRoutes)
app.use('/api', sectionRoutes)
app.use('/api', testsRoutes)
app.use('/api', photosRoutes)
app.use('/api', lessonsRoutes)
app.use('/api', additionsRoutes)
app.use('/api', aiRoutes)
app.use(errorHandler)

app.use('/api/v1/profiles/avatars/url/', express.static(path.join(__dirname, 'uploads/avatars')))
app.use('/api/v1/courses/photo/url/', express.static(path.join(__dirname, 'uploads/course')))

app.get('/server', (req, res) => {
    res.send('Server is running')
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
    console.log(`Documentation is available on http://localhost:${PORT}/api/v1/swagger/docs`)
})
