const Groq = require('groq-sdk')
const aiModel = require('../models/ai.models')

const MAX_MESSAGE_LENGTH = 2000
const MAX_MESSAGES_PER_MINUTE = 10
const HISTORY_LIMIT = 20

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

class AiService {
    // ──────────────── Отправка сообщения ────────────────

    async sendMessage(userId, messageText, sessionId) {
        // Валидация входных данных
        if (!messageText || messageText.trim().length === 0) {
            throw { status: 400, code: 'AI_001', message: 'Сообщение не может быть пустым' }
        }
        if (messageText.trim().length < 2) {
            throw { status: 400, code: 'AI_001', message: 'Сообщение слишком короткое' }
        }
        if (messageText.length > MAX_MESSAGE_LENGTH) {
            throw {
                status: 400,
                code: 'AI_002',
                message: `Сообщение не должно превышать ${MAX_MESSAGE_LENGTH} символов`,
            }
        }

        // Проверка лимита запросов
        const messageCount = await aiModel.checkRateLimit(userId)
        if (messageCount > MAX_MESSAGES_PER_MINUTE) {
            throw {
                status: 429,
                code: 'AI_003',
                message: 'Превышен лимит запросов. Попробуйте через минуту.',
            }
        }

        // Получение или создание сессии
        let session
        if (sessionId) {
            session = await aiModel.getSessionById(sessionId)
            if (!session) {
                throw { status: 404, code: 'AI_004', message: 'Сессия не найдена' }
            }
            if (session.user_id !== userId) {
                throw { status: 403, code: 'AI_006', message: 'Доступ запрещён' }
            }
        } else {
            session = await aiModel.createSession(userId)
        }

        // Параллельная загрузка контекста и истории
        const [courses, faq, userInfo, history] = await Promise.all([
            aiModel.getCoursesContext(),
            aiModel.getFaqContext(),
            aiModel.getUserInfo(userId),
            aiModel.getSessionMessages(session.id, HISTORY_LIMIT),
        ])

        // Формирование системного промпта
        const systemPrompt = this._buildSystemPrompt(courses, faq, userInfo)

        // Формирование массива сообщений для Groq:
        // role: 'system' | 'user' | 'assistant'
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: messageText.trim() },
        ]

        // Запрос к Groq API
        let assistantMessage
        try {
            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 1024,
                temperature: 0.7,
            })
            assistantMessage = response.choices[0].message.content
        } catch (error) {
            console.error('[AI] Ошибка вызова Groq API:', error?.message || error)
            throw { status: 503, code: 'AI_005', message: 'Сервис ИИ временно недоступен' }
        }

        // Сохранение сообщений в БД
        await aiModel.saveMessage(session.id, 'user', messageText.trim())
        await aiModel.saveMessage(session.id, 'assistant', assistantMessage)

        return {
            sessionId: session.id,
            message: assistantMessage,
        }
    }

    // ──────────────── Получение сессий пользователя ────────────────

    async getUserSessions(userId, query) {
        const limit = Math.min(parseInt(query.limit, 10) || 10, 100)
        const offset = parseInt(query.offset, 10) || 0
        return await aiModel.getUserSessions(userId, limit, offset)
    }

    // ──────────────── Получение сообщений сессии ────────────────

    async getSessionMessages(userId, sessionId) {
        const session = await aiModel.getSessionById(sessionId)
        if (!session) {
            throw { status: 404, code: 'AI_004', message: 'Сессия не найдена' }
        }
        if (session.user_id !== userId) {
            throw { status: 403, code: 'AI_006', message: 'Доступ запрещён' }
        }
        const messages = await aiModel.getSessionMessages(sessionId)
        return { sessionId: session.id, messages }
    }

    // ──────────────── Удаление сессии ────────────────

    async deleteSession(userId, sessionId) {
        const session = await aiModel.getSessionById(sessionId)
        if (!session) {
            throw { status: 404, code: 'AI_004', message: 'Сессия не найдена' }
        }
        if (session.user_id !== userId) {
            throw { status: 403, code: 'AI_006', message: 'Доступ запрещён' }
        }
        await aiModel.deleteSession(sessionId)
    }

    // ──────────────── Формирование системного промпта ────────────────

    _buildSystemPrompt(courses, faq, userInfo) {
        const coursesText =
            courses.length > 0
                ? courses
                      .map((c) => {
                          const tags =
                              Array.isArray(c.tags) && c.tags.length
                                  ? c.tags.join(', ')
                                  : 'не указаны'
                          return `- ID: ${c.id} | "${c.title}" | Сложность: ${c.difficulty || 'не указана'} | Теги: ${tags} | Рейтинг: ${c.rating} | Подписчиков: ${c.subscribers} | Длительность: ${c.course_duration} ч.`
                      })
                      .join('\n')
                : 'Курсы пока не добавлены.'

        const faqByCategory = {}
        faq.forEach((f) => {
            if (!faqByCategory[f.category]) faqByCategory[f.category] = []
            faqByCategory[f.category].push(`В: ${f.question}\nО: ${f.answer}`)
        })
        const faqText =
            Object.keys(faqByCategory).length > 0
                ? Object.entries(faqByCategory)
                      .map(([cat, items]) => `### ${cat}\n${items.join('\n\n')}`)
                      .join('\n\n')
                : 'FAQ пока не заполнен.'

        const userName = userInfo ? `${userInfo.name} ${userInfo.surname}` : 'Пользователь'

        return `Ты — ИИ-ассистент образовательной платформы по обучению программированию. Платформа предлагает курсы по различным языкам программирования и технологиям разработки.

Имя пользователя: ${userName}

## Твоя роль

Ты помогаешь пользователям в двух и только в двух вещах:
1. Подобрать подходящий курс с платформы
2. Ответить на вопросы о работе платформы

Всё остальное — за пределами твоей компетенции.

## Строгие правила поведения

**Если вопрос не связан с платформой или обучением программированию:**
Не отвечай по существу. Вежливо скажи, что ты можешь помочь только с подбором курсов или вопросами о платформе, и предложи одно из двух: подобрать курс или ответить на вопрос о сайте.
Пример реакции: «Я специализируюсь на помощи с выбором курсов и вопросах о нашей платформе. Могу помочь подобрать курс по программированию или ответить на вопросы о работе сайта — что вас интересует?»

**Если вопрос о программировании, но не о платформе** (например, «как работает рекурсия?», «что такое ООП?»):
Дай очень краткий ответ (1–2 предложения), затем сразу переведи разговор на платформу — предложи найти курс по этой теме.
Пример: «Рекурсия — это когда функция вызывает саму себя. Если хотите разобраться глубже, могу подобрать подходящий курс — есть ли у вас уже опыт в программировании?»

## Сценарий: пользователь новичок или не знает с чего начать

Когда пользователь говорит что-то вроде «я новичок», «хочу научиться программировать», «с чего начать», «какой язык выбрать» — **не давай готовый совет сразу**. Вместо этого задай уточняющие вопросы, чтобы подобрать курс точно под него. Задавай по одному вопросу за раз:

Шаг 1 — спроси о цели:
«Отлично, что решили начать! Чтобы подобрать подходящий курс, расскажите: что вы хотите уметь в итоге? Например — создавать сайты, мобильные приложения, автоматизировать задачи, анализировать данные, сменить профессию на разработчика?»

Шаг 2 — после ответа на цель, если нужно уточни уровень:
«Понял! Вы уже сталкивались с программированием раньше, или это будет первый опыт?»

Шаг 3 — подбери курс из каталога и назови его с кратким обоснованием:
«На основе ваших целей рекомендую курс "[название]" (сложность: [уровень], теги: [теги], длительность: [часы] ч.). [1–2 предложения почему именно он подходит.]»

## Каталог курсов

${coursesText}

## База знаний (FAQ)

${faqText}

## Правила рекомендаций

- Предлагай только курсы из каталога выше — никакие внешние ресурсы не упоминай
- При рекомендации всегда указывай: название, сложность, теги, длительность
- Если в каталоге нет подходящего курса — честно скажи об этом: «Пока такого курса нет, но вы можете следить за обновлениями каталога»
- При ответах на вопросы о платформе используй только информацию из FAQ выше
- Отвечай на русском языке, дружелюбно и по существу`
    }
}

module.exports = new AiService()
