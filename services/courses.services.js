const coursesModel = require('../models/courses.models')

class CoursesService {
    async createCourse(info, creatorId) {
        try {
            if (
                !info.title ||
                !creatorId ||
                !info.courseDuration ||
                !info.difficultyId ||
                !info.courseDuration ||
                info.tags.length === 0
            ) {
                throw { status: 400, message: 'Не все поля заполнены' }
            }

            const courseId = await coursesModel.createCourse(info, creatorId)

            const tags = info.tags.map((num) => [courseId, num])

            await coursesModel.addCourseTags(courseId, tags)

            return courseId
        } catch (error) {
            throw error
        }
    }

    async updateCourse(info, creatorId) {
        try {
            if (
                !info.title ||
                !info.description ||
                !info.courseDuration ||
                !info.difficultyId ||
                !info.coursePhoto ||
                !info.courseId ||
                !creatorId ||
                info.tags.length === 0
            ) {
                throw { status: 400, message: 'Не все поля заполнены' }
            }

            await coursesModel.updateCourse(info, creatorId)
            const tags = info.tags.map((num) => [info.courseId, num])
            await coursesModel.addCourseTags(info.courseId, tags)
            return info.courseId
        } catch (error) {
            throw error
        }
    }

    async deleteCourse(courseId, userId) {
        try {
            if (courseId.length === 0 || userId.length === 0) {
                throw { status: 400, message: 'Не все поля заполнены' }
            }

            await coursesModel.deleteCourse(courseId, userId)
        } catch (error) {
            throw error
        }
    }

    async getCourseInfoById(id) {
        try {
            if (id.length === 0) {
                throw { status: 400, message: 'Id курса не предоставлен' }
            }
            const info = await coursesModel.getCourseInfoById(id)
            if (!info) {
                throw { status: 404, message: 'Курс не найден' }
            }
            return info
        } catch (error) {
            throw error
        }
    }

    async getChosenCourses(query, id) {
        try {
            const limit = parseInt(query.limit, 10) || 'ALL'
            const offset = parseInt(query.offset, 10) || '0'
            const status = query.status

            if (status !== 'active' && status !== 'completed') {
                throw { status: 400, message: 'Неверные значения status' }
            }

            const statusCondition = status === 'active'

            const info = await coursesModel.getChosenCourses(id, limit, offset, statusCondition)

            if (info.total === 0) {
                throw {
                    status: 404,
                    message: `У этого пользователя нет выбранных курсов со статусом ${status}`,
                }
            }

            return info
        } catch (error) {
            throw error
        }
    }

    async getCourses(req) {
        try {
            const { query, difficulty, tags, sort = 'id', order = 'asc', limit, offset } = req

            if (query && query.length > 255) {
                throw { status: 414, message: 'Слишком длинный запрос' }
            }

            // Преобразуем параметры в массивы
            const difficultyIds = difficulty ? difficulty.split(',').map(Number) : []
            const tagIds = tags ? tags.split(',').map(Number) : []
            let sortBy = ''

            if (sort === 'creation') {
                sortBy = 'creation_date'
            } else sortBy = sort

            const list = await coursesModel.getSortedCourses(
                query,
                difficultyIds,
                tagIds,
                sort,
                order,
                limit,
                offset,
            )

            if (list.courses.length === 0) {
                throw { status: 404, message: 'Курсы не найдены' }
            }

            return list
        } catch (error) {
            throw error
        }
    }

    async addCourseSubscriber(courseId, userId) {
        try {
            if (courseId.length === 0 || userId.length === 0) {
                throw { status: 400, message: 'Не все поля заполнены' }
            }
            await coursesModel.addCourseSubscriber(userId, courseId)
            return courseId
        } catch (error) {
            throw error.code === '23505'
                ? { status: 409, message: 'Пользователь уже подписан на этот курс' }
                : error.code === '23503'
                  ? { status: 404, message: 'Курс не найден' }
                  : error
        }
    }

    async removeCourseSubscriber(courseId, userId) {
        try {
            if (courseId.length === 0 || userId.length === 0) {
                throw { status: 400, message: 'Не все поля заполнены' }
            }
            await coursesModel.removeCourseSubscriber(userId, courseId)
            return courseId
        } catch (error) {
            throw error
        }
    }
}

module.exports = new CoursesService()
