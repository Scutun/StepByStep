const db = require('../config/db').pool
const redis = require('../config/db').redisClient

const AI_RATE_LIMIT_WINDOW_SEC = 60
const AI_RATE_LIMIT_MAX = 10

class AiModel {
    // ──────────────── Sessions ────────────────

    async createSession(userId) {
        const result = await db.query(
            `INSERT INTO chat_sessions (user_id) VALUES ($1) RETURNING id, created_at`,
            [userId],
        )
        return result.rows[0]
    }

    async getSessionById(sessionId) {
        const result = await db.query(`SELECT * FROM chat_sessions WHERE id = $1`, [sessionId])
        return result.rows[0]
    }

    async getUserSessions(userId, limit, offset) {
        const countResult = await db.query(
            `SELECT COUNT(*) AS total FROM chat_sessions WHERE user_id = $1`,
            [userId],
        )
        const total = parseInt(countResult.rows[0].total, 10)

        const sessions = await db.query(
            `SELECT id, created_at, updated_at
             FROM chat_sessions
             WHERE user_id = $1
             ORDER BY updated_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset],
        )
        return { total, sessions: sessions.rows }
    }

    async deleteSession(sessionId) {
        await db.query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId])
    }

    // ──────────────── Messages ────────────────

    async saveMessage(sessionId, role, content) {
        const result = await db.query(
            `INSERT INTO chat_messages (session_id, role, content)
             VALUES ($1, $2, $3)
             RETURNING id, created_at`,
            [sessionId, role, content],
        )
        await db.query(`UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`, [sessionId])
        return result.rows[0]
    }

    async getSessionMessages(sessionId, limit = 50) {
        const result = await db.query(
            `SELECT id, role, content, created_at
             FROM chat_messages
             WHERE session_id = $1
             ORDER BY created_at ASC
             LIMIT $2`,
            [sessionId, limit],
        )
        return result.rows
    }

    // ──────────────── Context data ────────────────

    async getCoursesContext() {
        const result = await db.query(
            `SELECT c.id,
                    c.title,
                    c.description,
                    d.name AS difficulty,
                    ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) AS tags,
                    c.rating,
                    c.subscribers,
                    c.course_duration
             FROM courses c
             LEFT JOIN difficulties d ON c.difficulty_id = d.id
             LEFT JOIN course_tags ct ON c.id = ct.course_id
             LEFT JOIN tags t ON ct.tag_id = t.id
             GROUP BY c.id, d.name
             ORDER BY c.subscribers DESC`,
        )
        return result.rows
    }

    async getFaqContext() {
        const result = await db.query(
            `SELECT question, answer, category FROM faq ORDER BY category, id`,
        )
        return result.rows
    }

    async getUserInfo(userId) {
        const result = await db.query(
            `SELECT name, surname, nickname FROM users WHERE id = $1`,
            [userId],
        )
        return result.rows[0]
    }

    // ──────────────── Rate limiting ────────────────

    async checkRateLimit(userId) {
        const key = `ai_rate:${userId}`
        const count = await redis.incr(key)
        if (count === 1) {
            await redis.expire(key, AI_RATE_LIMIT_WINDOW_SEC)
        }
        return count
    }
}

module.exports = new AiModel()
