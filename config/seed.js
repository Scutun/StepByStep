require('dotenv').config()
const { Pool } = require('pg')
const { MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')

const dbName = process.env.DB_NAME || 'stepbystep'

const pgConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: dbName,
}

const mongoUri = process.env.MONGO_URI
const mongoDbName = process.env.MONGO_DB_NAME || 'stepbystep'

// Содержимое уроков по имени. Используется при заполнении MongoDB.
const lessonContent = {
    'Что такое JavaScript': {
        content:
            '<h2>JavaScript</h2><p>JavaScript — это высокоуровневый язык программирования, который изначально создавался для оживления страниц в браузере, а сегодня используется и на сервере (Node.js).</p>',
        duration: 10,
    },
    'Переменные и типы данных': {
        content:
            '<h2>Переменные</h2><p>Объявить переменную можно через <code>let</code>, <code>const</code> или (устаревший) <code>var</code>. Основные примитивные типы: number, string, boolean, null, undefined, symbol, bigint.</p>',
        duration: 12,
    },
    'Объявление функций': {
        content:
            '<h2>Функции</h2><p>В JavaScript функция объявляется через <code>function</code> или стрелочный синтаксис <code>() =&gt; {}</code>. Функции — это значения первого класса.</p>',
        duration: 14,
    },
    'Работа с объектами': {
        content:
            '<h2>Объекты</h2><p>Объект — это коллекция пар ключ-значение. Доступ к свойствам осуществляется через точечную нотацию или квадратные скобки.</p>',
        duration: 15,
    },
    'Установка Python и hello world': {
        content:
            '<h2>Hello, world</h2><p>Скачайте Python с python.org. Первая программа: <code>print("Hello, world!")</code></p>',
        duration: 8,
    },
    'Условные операторы и циклы': {
        content:
            '<h2>if / for / while</h2><p>В Python блоки задаются отступами. <code>if</code> позволяет ветвить выполнение, <code>for</code> и <code>while</code> — повторять.</p>',
        duration: 13,
    },
    'Списки и кортежи': {
        content:
            '<h2>list и tuple</h2><p>Список — изменяемая упорядоченная коллекция. Кортеж — неизменяемый. Используются для хранения последовательностей значений.</p>',
        duration: 11,
    },
    'Словари и множества': {
        content:
            '<h2>dict и set</h2><p>Словарь хранит пары ключ-значение, множество — уникальные элементы. Обе структуры дают O(1) доступ по ключу/элементу.</p>',
        duration: 12,
    },
    'Что такое реляционная БД': {
        content:
            '<h2>Реляционные базы данных</h2><p>Данные хранятся в таблицах со строками и столбцами. Связи между таблицами выражаются через внешние ключи.</p>',
        duration: 9,
    },
    'Запрос SELECT и WHERE': {
        content:
            '<h2>SELECT</h2><p>Базовый запрос: <code>SELECT col1, col2 FROM table WHERE condition;</code> Возвращает строки, удовлетворяющие условию.</p>',
        duration: 12,
    },
    'JOIN: соединение таблиц': {
        content:
            '<h2>JOIN</h2><p>Виды соединений: INNER, LEFT, RIGHT, FULL. Соединяют строки разных таблиц по общему ключу.</p>',
        duration: 16,
    },
    'GROUP BY и агрегатные функции': {
        content:
            '<h2>GROUP BY</h2><p>Группировка строк по значению колонки. Агрегатные функции: COUNT, SUM, AVG, MIN, MAX.</p>',
        duration: 14,
    },
}

// Содержимое тестов по имени.
const testContent = {
    'Тест: основы JavaScript': {
        questions: [
            {
                question: 'Какое ключевое слово создает константу?',
                options: ['var', 'let', 'const', 'static'],
                correctAnswer: 2,
            },
            {
                question: 'Какой из перечисленных типов является примитивным?',
                options: ['Object', 'Array', 'string', 'Map'],
                correctAnswer: 2,
            },
        ],
    },
    'Тест: функции и объекты': {
        questions: [
            {
                question: 'Как объявить стрелочную функцию?',
                options: ['function () {}', '() => {}', 'fn => return', 'lambda: 1'],
                correctAnswer: 1,
            },
            {
                question: 'Как получить значение свойства name у объекта user?',
                options: ['user->name', 'user.name', 'user::name', 'user@name'],
                correctAnswer: 1,
            },
        ],
    },
    'Тест: основы Python': {
        questions: [
            {
                question: 'Что выведет print(2 ** 3)?',
                options: ['6', '8', '9', '23'],
                correctAnswer: 1,
            },
            {
                question: 'Как объявить функцию в Python?',
                options: ['function f():', 'def f():', 'fn f():', 'func f():'],
                correctAnswer: 1,
            },
        ],
    },
    'Тест: структуры данных': {
        questions: [
            {
                question: 'Какая структура хранит уникальные элементы?',
                options: ['list', 'tuple', 'set', 'str'],
                correctAnswer: 2,
            },
            {
                question: 'Что вернет {"a": 1}["a"]?',
                options: ['"a"', '1', 'None', 'KeyError'],
                correctAnswer: 1,
            },
        ],
    },
    'Тест: основы SQL': {
        questions: [
            {
                question: 'Какой оператор фильтрует строки?',
                options: ['SELECT', 'WHERE', 'FROM', 'ORDER BY'],
                correctAnswer: 1,
            },
            {
                question: 'Что делает оператор DISTINCT?',
                options: [
                    'Сортирует',
                    'Удаляет дубликаты',
                    'Объединяет таблицы',
                    'Считает строки',
                ],
                correctAnswer: 1,
            },
        ],
    },
    'Тест: соединения и агрегации': {
        questions: [
            {
                question: 'Какой JOIN возвращает строки только с совпадениями в обеих таблицах?',
                options: ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN'],
                correctAnswer: 2,
            },
            {
                question: 'Какая функция считает количество строк?',
                options: ['SUM', 'AVG', 'COUNT', 'MAX'],
                correctAnswer: 2,
            },
        ],
    },
}

const seedPostgres = async (pool) => {
    const sqlPath = path.join(__dirname, 'seed.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    await pool.query(sql)
    console.log('PostgreSQL: моковые данные успешно записаны.')
}

const seedMongo = async (pool) => {
    if (!mongoUri) {
        console.warn('MONGO_URI не задан в .env — пропускаем заполнение MongoDB.')
        return
    }

    const client = new MongoClient(mongoUri)
    await client.connect()
    const db = client.db(mongoDbName)

    try {
        const lessonsCol = db.collection('lessons')
        const testsCol = db.collection('tests')

        const result = await pool.query(
            `SELECT l.id, l.name, l.is_test, s.id AS section_id, s.course_id
             FROM lessons l
             JOIN sections s ON l.section_id = s.id
             ORDER BY l.id`,
        )

        for (const row of result.rows) {
            const doc = {
                _id: row.id,
                sectionId: row.section_id,
                courseId: row.course_id,
            }

            if (row.is_test) {
                doc.info = testContent[row.name] || {
                    questions: [
                        {
                            question: 'Заглушка вопроса',
                            options: ['A', 'B', 'C', 'D'],
                            correctAnswer: 0,
                        },
                    ],
                }
                await testsCol.updateOne({ _id: row.id }, { $set: doc }, { upsert: true })
            } else {
                doc.info = lessonContent[row.name] || {
                    content: '<p>Содержимое урока будет добавлено позже.</p>',
                    duration: 10,
                }
                await lessonsCol.updateOne({ _id: row.id }, { $set: doc }, { upsert: true })
            }
        }

        console.log(
            `MongoDB: записано ${result.rowCount} документов в коллекции lessons и tests.`,
        )
    } finally {
        await client.close()
    }
}

const run = async () => {
    const pool = new Pool(pgConfig)
    try {
        await seedPostgres(pool)
        await seedMongo(pool)
        console.log('Заполнение базы моковыми данными завершено.')
    } catch (error) {
        console.error('Ошибка при заполнении базы моковыми данными:', error)
        process.exitCode = 1
    } finally {
        await pool.end()
        process.exit(process.exitCode || 0)
    }
}

run()
