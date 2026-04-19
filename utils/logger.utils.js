const fs = require('fs')
const path = require('path')

const LOGS_DIR = path.join(__dirname, '..', 'logs')

// In-memory cache: userId -> { date: 'YYYY-MM-DD', filePath }
const activeFiles = new Map()

function getLogFile(userId) {
    const today = new Date().toISOString().slice(0, 10)
    const key = String(userId)

    const cached = activeFiles.get(key)
    if (cached && cached.date === today) {
        return cached.filePath
    }

    const userDir = path.join(LOGS_DIR, `user_${key}`)
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true })
    }

    // After server restart — reuse existing file for today if it exists
    const existing = fs.readdirSync(userDir).find((f) => f.startsWith(today))
    if (existing) {
        const filePath = path.join(userDir, existing)
        activeFiles.set(key, { date: today, filePath })
        return filePath
    }

    // New day — create file with date + creation time in the name
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const fileName = `${today}_${hh}-${mm}-${ss}.txt`
    const filePath = path.join(userDir, fileName)

    activeFiles.set(key, { date: today, filePath })
    return filePath
}

function formatTimestamp(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19)
}

function logRequest(userId, method, endpoint, statusCode, durationMs, errorCode, errorMessage) {
    try {
        const filePath = getLogFile(userId)
        const ts = formatTimestamp(new Date())
        const success = statusCode < 400

        let line = `[${ts}] ${method} ${endpoint} | user: ${userId} | status: ${statusCode} | `

        if (success) {
            line += `OK | ${durationMs}ms`
        } else {
            line += 'ERROR'
            if (errorCode) line += ` | code: ${errorCode}`
            if (errorMessage) line += ` | ${errorMessage}`
            line += ` | ${durationMs}ms`
        }

        fs.appendFileSync(filePath, line + '\n', 'utf8')
    } catch (err) {
        console.error('Logger error:', err.message)
    }
}

module.exports = { logRequest }
