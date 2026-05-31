const db = require('../config/db').pool

class ReviewsModel {
    async createReview(info) {
        try {
            await db.query(
                `INSERT INTO comments (rating, content, user_nickname, course_id) 
                 VALUES ($1, $2, (SELECT nickname FROM users WHERE id = $3), $4)`,
                [info.rating, info.content, info.userId, info.courseId],
            )

            await db.query(
                `UPDATE courses SET rating = (SELECT AVG(rating) FROM comments WHERE course_id = $1), reviews_count = (SELECT COUNT(*) FROM comments WHERE course_id = $1) WHERE id = $1`,
                [info.courseId],
            )
        } catch (error) {
            if (error.code === '23505') {
                throw {
                    status: 400,
                    message: 'Этот пользователь уже оставил отзыв для этого курса',
                }
            }
            throw error
        }
    }

    async getReviewByCourseId(id) {
        try {
            const review = await db.query(
                `SELECT id, rating, content, user_nickname as nickname FROM comments WHERE course_id = $1`,
                [id],
            )
            return review.rows
        } catch (error) {
            throw error
        }
    }

    async deleteReview(userId, reviewId) {
        try {
            const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [userId])
            const isAdmin = adminCheck.rowCount > 0 && adminCheck.rows[0].admin

            let result
            if (isAdmin) {
                result = await db.query('DELETE FROM comments WHERE id = $1', [reviewId])
            } else {
                result = await db.query(
                    `DELETE FROM comments
                     WHERE id = $1 AND user_nickname = (SELECT nickname FROM users WHERE id = $2)`,
                    [reviewId, userId],
                )
            }

            if (result.rowCount == 0) {
                throw { status: 404, message: 'Комментарий не найден' }
            }
        } catch (error) {
            throw error
        }
    }

    async changeReview(info) {
        try {
            const result = await db.query(
                `UPDATE comments 
                 SET rating = $1, content = $2 
                 WHERE id = $3 
                 AND user_nickname = (SELECT nickname FROM users WHERE id = $4) 
                 
                 RETURNING *`,
                [info.rating, info.content, info.commentId, info.userId],
            )

            if (result.rowCount === 0) {
                throw { status: 404, message: 'Комментарий не найден' }
            }

            return result.rows[0]
        } catch (error) {
            throw error
        }
    }
}

module.exports = new ReviewsModel()
