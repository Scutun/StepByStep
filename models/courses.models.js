const db = require('../config/db').pool
const redis = require('../config/db').redisClient

class CoursesModel {
    async createCourse(info, creatorId) {
        try {
            const result = await db.query(
                `INSERT INTO courses (title, description, creator_id, course_duration, difficulty_id, creation_date) 
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
                [info.title, info.description, creatorId, info.courseDuration, info.difficultyId],
            )

            return result.rows[0].id
        } catch (error) {
            throw error
        }
    }

    async addCourseTags(courseId, tagsArray) {
        try {
            await db.query('DELETE FROM course_tags WHERE course_id = $1', [courseId])

            const values = tagsArray.flat()
            const placeholders = tagsArray
                .map((row, i) => `(${row.map((_, j) => `$${i * row.length + j + 1}`).join(', ')})`)
                .join(', ')

            await db.query(
                `INSERT INTO course_tags (course_id, tag_id) VALUES ${placeholders}`,
                values,
            )
        } catch (error) {
            throw error
        }
    }

    async updateCourse(info, creatorId) {
        try {
            const course = await db.query(
                `SELECT * FROM courses where creator_id = $1 and id = $2`,
                [creatorId, info.courseId],
            )
            if (course.rowCount < 1) {
                throw { status: 403, message: 'У вас недостаточно прав для удаления этого курса' }
            }
            const result = await db.query(
                `UPDATE courses 
                 SET title = $1, 
                     description = $2, 
                     course_duration = $3, 
                     difficulty_id = $4,
                     course_photo = $5  
                 WHERE id = $6 and creator_id = $7`,
                [
                    info.title,
                    info.description,
                    info.courseDuration,
                    info.difficultyId,
                    info.coursePhoto,
                    info.courseId,
                    creatorId,
                ],
            )
        } catch (error) {
            throw error
        }
    }

    async deleteCourse(courseId, userId) {
        try {
            const adminCheck = await db.query('SELECT admin FROM users WHERE id = $1', [userId])
            const isAdmin = adminCheck.rowCount > 0 && adminCheck.rows[0].admin

            if (!isAdmin) {
                const course = await db.query(
                    `SELECT * FROM courses where creator_id = $1 and id = $2`,
                    [userId, courseId],
                )
                if (course.rowCount < 1) {
                    throw {
                        status: 403,
                        message: 'У вас недостаточно прав для удаления этого курса',
                    }
                }
            }

            await redis.del(`course:${courseId}`)
            await db.query('DELETE FROM courses WHERE id = $1', [courseId])
        } catch (error) {
            throw error
        }
    }

    async getCourseInfoById(id) {
        try {
            const info = await db.query(
                `SELECT 
                    courses.id, courses.id, courses.title, courses.description, 
                    CONCAT(users.name, ' ', users.surname) AS creator, 
                    courses.creation_date, courses.course_duration, difficulties.name AS difficulty, 
                    ARRAY_AGG(tags.name) AS tags
                  FROM courses
                  LEFT JOIN users ON courses.creator_id = users.id
                  LEFT JOIN difficulties ON courses.difficulty_id = difficulties.id
                  LEFT JOIN course_tags ON courses.id = course_tags.course_id
                  LEFT JOIN tags ON course_tags.tag_id = tags.id
                  WHERE courses.id = $1
                  GROUP BY courses.id, users.name, users.surname, difficulties.name`,
                [id],
            )
            return info.rows[0]
        } catch (error) {
            throw error
        }
    }

    async getChosenCourses(id, limit, offset, status) {
        try {
            const countResult = await db.query(
                `SELECT COUNT(*) AS total 
                 FROM user_courses
                 WHERE user_id = $1 AND active = $2`,
                [id, status],
            )

            const total = parseInt(countResult.rows[0].total, 10)

            let query = `SELECT courses.id, CONCAT(users.name, ' ', users.surname) AS creator, 
                        courses.course_photo AS photo, 
                        courses.title,
                        courses.rating,
                        courses.reviews_count as reviews,
                        courses.subscribers, 
                        courses.course_duration as duration,
                        user_courses.progress
                 FROM user_courses
                 LEFT JOIN courses ON user_courses.course_id = courses.id                
                 LEFT JOIN users ON courses.creator_id = users.id
                 WHERE user_courses.user_id = $1 AND user_courses.active = $2
                 GROUP BY courses.id, users.name, users.surname,user_courses.progress`

            const params = [id, status]

            if (limit !== 'ALL') {
                query += ` LIMIT $3 OFFSET $4`
                params.push(Number(limit) || 10, Number(offset) || 0)
            }

            const courses = await db.query(query, params)
            return { total, courses: courses.rows }
        } catch (error) {
            throw error
        }
    }

    async getAllCourses(limit, offset, search) {
        try {
            const searchQuery = search ? `%${search}%` : `%`

            const countResult = await db.query(
                `SELECT COUNT(DISTINCT courses.id) AS total 
                 FROM courses
                 LEFT JOIN course_tags ON courses.id = course_tags.course_id
                 LEFT JOIN tags ON course_tags.tag_id = tags.id
                 WHERE courses.title ILIKE $1 OR tags.name ILIKE $1`,
                [searchQuery],
            )

            const total = parseInt(countResult.rows[0].total, 10)

            let query = `SELECT courses.id, CONCAT(users.name, ' ', users.surname) AS creator, 
                courses.course_photo AS photo, 
                courses.title,
                courses.description,
                courses.rating,
                courses.reviews_count as reviews,
                courses.subscribers, 
                courses.course_duration as duration
            FROM courses
            LEFT JOIN users ON courses.creator_id = users.id
            LEFT JOIN course_tags ON courses.id = course_tags.course_id
            LEFT JOIN tags ON course_tags.tag_id = tags.id
            WHERE courses.title ILIKE $1 OR tags.name ILIKE $1
            GROUP BY courses.id, users.name, users.surname
            ORDER BY courses.id`

            const params = [searchQuery]

            if (limit !== 'ALL') {
                query += ` LIMIT $2 OFFSET $3`
                params.push(Number(limit) || 10, Number(offset) || 0)
            }

            const info = await db.query(query, params)
            return { total, courses: info.rows }
        } catch (error) {
            throw error
        }
    }

    async getSortedCourses(query, difficultyIds, tagIds, sort, order, limit, offset) {
        try {
            let sql = `
  SELECT c.id,
         CONCAT(u.name, ' ', u.surname) AS creator,
         c.course_photo AS photo,
         c.title,
         c.description,
         c.rating,
         c.reviews_count AS reviews,
         c.subscribers,
         c.course_duration AS duration,
         c.creation_date as creationDate
  FROM courses c
  LEFT JOIN users u ON c.creator_id = u.id
  LEFT JOIN course_tags ct ON c.id = ct.course_id
  LEFT JOIN tags t ON ct.tag_id = t.id
  WHERE 1 = 1
`

            const values = []

            // Поиск по названию курса и тегам
            if (query) {
                sql += ` AND (c.title ILIKE $${values.length + 1} OR t.name ILIKE $${values.length + 2})`
                values.push(`%${query}%`, `%${query}%`)
            }

            if (difficultyIds && difficultyIds.length > 0) {
                sql += ` AND c.difficulty_id = ANY($${values.length + 1})`
                values.push(difficultyIds)
            }

            if (tagIds && tagIds.length > 0) {
                sql += ` AND c.id IN (
        SELECT course_id FROM course_tags
        WHERE tag_id = ANY($${values.length + 1})
    )`
                values.push(tagIds)
            }

            const allowedSortFields = ['creation_date', 'subscribers', 'id']
            const sortField = allowedSortFields.includes(sort) ? sort : 'id'
            const sortOrder = order && order.toLowerCase() === 'desc' ? 'DESC' : 'ASC'

            sql += `
  GROUP BY c.id, u.name, u.surname, c.course_photo, c.title, c.description, c.rating, c.reviews_count, c.subscribers, c.course_duration
  ORDER BY c.${sortField} ${sortOrder}
`
            const countResult = await db.query(sql, values)

            const total = parseInt(countResult.rowCount, 10)

            if (limit) {
                sql += ` LIMIT $${values.length + 1}`
                values.push(Number(limit))
            }

            if (offset) {
                sql += ` OFFSET $${values.length + 1}`
                values.push(Number(offset))
            }

            // Выполнение запроса
            const info = await db.query(sql, values)
            return { total, courses: info.rows }
        } catch (error) {
            throw error
        }
    }

    async getCourseById(id) {
        try {
            const info = await db.query(`SELECT creator_id FROM courses WHERE id = $1`, [id])

            return info
        } catch (error) {
            throw error
        }
    }

    async addCourseSubscriber(ueserId, courseId) {
        try {
            await db.query(`INSERT INTO user_courses (user_id, course_id) VALUES ($1,$2)`, [
                ueserId,
                courseId,
            ])
        } catch (error) {
            throw error
        }
    }

    async removeCourseSubscriber(ueserId, courseId) {
        try {
            await db.query(`DELETE FROM user_courses WHERE user_id = $1 AND course_id = $2`, [
                ueserId,
                courseId,
            ])
        } catch (error) {
            throw error
        }
    }
}

module.exports = new CoursesModel()
