[![Node](https://img.shields.io/badge/node-20.5.1-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-9.8.0-red.svg)](https://www.npmjs.com/)

# StepByStep Backend

Бэкенд образовательной платформы по программированию. Предоставляет REST API для управления пользователями, курсами, уроками, тестами и отзывами. Включает ИИ-ассистента на базе Llama 3.3 для подбора курсов и ответов на вопросы о платформе.

---

## Технологии

| Слой             | Технология                                  |
| ---------------- | ------------------------------------------- |
| Язык / Фреймворк | Node.js 20, Express.js                      |
| База данных      | PostgreSQL (основные данные)                |
| База данных      | MongoDB (содержимое уроков и тестов)        |
| Кэш / Сессии     | Redis                                       |
| Аутентификация   | JWT (access + refresh токены)               |
| ИИ-ассистент     | Groq API — Llama 3.3 70B (бесплатный тариф) |
| Документация API | Swagger UI                                  |
| Email            | Nodemailer                                  |

---

## Требования

- **Node.js** >= 20.5.1
- **Docker** (для Redis и MongoDB)
- **PostgreSQL** (отдельная установка или облачный сервис)
- Аккаунт [Groq](https://console.groq.com) для получения бесплатного API-ключа

---

## Установка и запуск

### 1. Клонировать репозиторий и установить зависимости

```bash
git clone https://github.com/Scutun/StepByStep.git
cd stepbystep
npm install
```

### 2. Настроить переменные окружения

Скопировать `.env_example` в `.env` и заполнить значения:

```bash
cp .env_example .env
```

Минимальный набор для запуска:

```env
# ИИ-ассистент (бесплатно на console.groq.com)
GROQ_API_KEY = gsk_...

# JWT
ACCESS_TOKEN_SECRET = any_random_secret
REFRESH_TOKEN_SECRET = another_random_secret
ACCESS_TOKEN_LIFE = 2h
REFRESH_TOKEN_LIFE = 14d

# PostgreSQL
DB_USER = postgres
DB_PASSWORD = your_password
DB_PORT = 5432
DB_HOST = localhost
DB_NAME = stepbystep

# Redis (Docker — значения по умолчанию)
REDIS_HOST = localhost
REDIS_PORT = 6379

# MongoDB (Docker — без авторизации)
MONGO_URI = mongodb://localhost:27017
MONGO_DB_NAME = stepbystep
```

### 3. Инициализировать базу данных PostgreSQL

```bash
npm run database
```

Создаст все таблицы, триггеры и начальные данные.

### 4. Запустить сервер разработки

```bash
npm run dev
```

Команда автоматически:

- Поднимает контейнеры Redis и MongoDB через Docker
- Запускает сервер с горячей перезагрузкой (nodemon)

---

## Команды

| Команда                 | Описание                                      |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Запуск в режиме разработки (Docker + nodemon) |
| `npm start`             | Запуск в продакшн-режиме                      |
| `npm run database`      | Инициализация схемы PostgreSQL                |
| `npm run merge-openapi` | Сборка единой Swagger-документации            |
| `npm run docker:up`     | Запустить только Docker-контейнеры            |
| `npm run docker:down`   | Остановить Docker-контейнеры                  |

---

## API-документация

После запуска сервера документация доступна по адресу:

```
http://localhost:3000/api/v1/swagger/docs
```

### Основные группы эндпоинтов

| Тег                 | Маршруты                                        |
| ------------------- | ----------------------------------------------- |
| Users               | Регистрация, авторизация, профиль, смена пароля |
| Courses             | Каталог курсов, подписка, фильтрация            |
| Sections            | Разделы курса                                   |
| Lessons             | Уроки, прохождение                              |
| Tests               | Тесты к урокам                                  |
| Reviews             | Отзывы и рейтинги                               |
| AI Assistant        | ИИ-чат, сессии диалога                          |
| Tags / Difficulties | Справочники                                     |

---

## ИИ-ассистент

Ассистент обрабатывает два типа запросов:

- **Подбор курса** — задаёт уточняющие вопросы (цель, уровень) и рекомендует курсы из каталога
- **Вопросы о платформе** — отвечает на основе базы FAQ

Лимит: **10 сообщений в минуту** на пользователя. История диалога хранится в сессиях.

Пример запроса:

```http
POST /api/v1/ai/chat
Authorization: Bearer <token>

{
  "message": "Я новичок, хочу научиться программировать — с чего начать?",
  "sessionId": 5
}
```

---

## Структура проекта

```
├── app.js                  # Точка входа
├── docker-compose.yml      # Redis + MongoDB для разработки
├── config/
│   ├── db.js               # Подключения к БД
│   ├── database.sql        # SQL-схема основных таблиц
│   └── doc.js              # Сборщик Swagger-документации
├── routes/                 # Маршруты Express
├── controllers/            # Обработчики запросов
├── services/               # Бизнес-логика
├── models/                 # Запросы к базам данных
├── middlewares/            # JWT-проверка, обработка ошибок
├── utils/                  # Утилиты (токены, email, фото)
└── docs/                   # Swagger YAML-файлы
```
