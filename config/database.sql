-- таблица словарь с уровнями сложности курса
CREATE TABLE IF NOT EXISTS difficulties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- таблица словарь с тегами для курсов
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- таблица словарь фотографий
CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(255) UNIQUE NOT NULL,
    reputation BIGINT DEFAULT 0,
    registration_date DATE NOT NULL,
    photo_id INTEGER DEFAULT 1,
    admin BOOLEAN DEFAULT FALSE,
    activated BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE SET NULL
);

-- таблица всех курсов
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255)  NOT NULL,
    description TEXT,
    creator_id BIGINT NOT NULL,
    creation_date DATE NOT NULL,
    course_duration INTEGER NOT NULL,
    rating NUMERIC(3, 1) NOT NULL DEFAULT 0,
    reviews_count BIGINT DEFAULT 0,
    course_photo TEXT DEFAULT 'DefaultCoursePhoto.jpg',
    subscribers INTEGER DEFAULT 0,
    lessons_count INT DEFAULT 0,

    difficulty_id BIGINT,
    
    FOREIGN KEY (difficulty_id) REFERENCES difficulties(id) ON DELETE SET NULL
);

-- таблица разделов
CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)  NOT NULL,
  UNIQUE (name , course_id ),
  course_id BIGINT NOT NULL,
  
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Промежуточная таблица для связи курсов и тегов
CREATE TABLE IF NOT EXISTS course_tags (
    id SERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- таблица уроков курса
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_test BOOLEAN NOT NULL,

    section_id BIGINT,
    
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- таблица курсов пользователя
CREATE TABLE IF NOT EXISTS user_courses (
    id SERIAL PRIMARY KEY,
    active BOOLEAN DEFAULT TRUE,

    user_id INT NOT NULL,
    course_id INT NOT NULL,

    progress INT DEFAULT 0,

    lessons_num_fin INT DEFAULT 0,

    UNIQUE (user_id, course_id),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_lessons (
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,

    PRIMARY KEY (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE

);

-- таблица коментариев
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    rating INT CHECK (rating > 0 AND rating <= 5),
    content TEXT NOT NULL,
    user_nickname VARCHAR(255) NOT NULL,

    course_id INT NOT NULL,

    UNIQUE (user_nickname, course_id),
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);



-- Триггер для автоматического добавления и удаления счетчика уроков
CREATE OR REPLACE FUNCTION update_lessons_count()
RETURNS TRIGGER AS $$
DECLARE
    course_id INT;
BEGIN
    -- Определяем course_id в зависимости от типа операции
    IF TG_OP = 'INSERT' THEN
        SELECT s.course_id INTO course_id
        FROM sections s
        WHERE s.id = NEW.section_id;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT s.course_id INTO course_id
        FROM sections s
        WHERE s.id = OLD.section_id;
    END IF;

    -- Обновляем lessons_count в таблице courses
    UPDATE courses
    SET lessons_count = (
        SELECT COUNT(*)
        FROM lessons l
        JOIN sections s ON l.section_id = s.id
        WHERE s.course_id = courses.id  
    )
    WHERE courses.id = course_id; 

    RETURN NULL; 
END;
$$ LANGUAGE plpgsql;

--Триггер на обновления количества уроков в курсе
DROP TRIGGER IF EXISTS trg_update_lessons_count ON lessons;

CREATE TRIGGER trg_update_lessons_count
AFTER INSERT OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_lessons_count();

-- Функция для обновления прогресса при добавлении урока
CREATE OR REPLACE FUNCTION update_user_progress()
RETURNS TRIGGER AS $$
DECLARE
    course_id_var INT;
    total_lessons INT;
    completed_lessons INT;
BEGIN
    -- Находим course_id и total_lessons через section_id -> courses
    SELECT s.course_id, c.lessons_count
    INTO course_id_var, total_lessons
    FROM lessons l
    JOIN sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE l.id = NEW.lesson_id;

    -- Если курс найден
    IF course_id_var IS NOT NULL THEN
        -- Считаем количество уже пройденных уроков пользователя
        SELECT COUNT(*) INTO completed_lessons
        FROM user_lessons ul
        JOIN lessons l ON ul.lesson_id = l.id
        JOIN sections s ON l.section_id = s.id
        WHERE ul.user_id = NEW.user_id AND s.course_id = course_id_var;

        -- Обновляем количество пройденных уроков и прогресс
        UPDATE user_courses
        SET lessons_num_fin = completed_lessons,
            progress = CASE
                WHEN total_lessons > 0 THEN CEIL((completed_lessons::DECIMAL / total_lessons) * 100)
                ELSE 0
            END
        WHERE user_id = NEW.user_id AND course_id = course_id_var;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для обновления прогресса при добавлении урока
DROP TRIGGER IF EXISTS trg_update_user_progress ON user_lessons;

CREATE TRIGGER trg_update_user_progress
AFTER INSERT ON user_lessons
FOR EACH ROW
EXECUTE FUNCTION update_user_progress();


-- Функция для обновления прогресса при удалении урока
CREATE OR REPLACE FUNCTION update_user_progress_on_delete()
RETURNS TRIGGER AS $$
DECLARE
    course_id_var INT;
    total_lessons INT;
    completed_lessons INT;
BEGIN
    -- Находим course_id и total_lessons
    SELECT s.course_id, c.lessons_count
    INTO course_id_var, total_lessons
    FROM lessons l
    JOIN sections s ON l.section_id = s.id
    JOIN courses c ON s.course_id = c.id
    WHERE l.id = OLD.lesson_id;

    -- Если курс найден
    IF course_id_var IS NOT NULL THEN
        -- Пересчитываем пройденные уроки пользователя
        SELECT COUNT(*) INTO completed_lessons
        FROM user_lessons ul
        JOIN lessons l ON ul.lesson_id = l.id
        JOIN sections s ON l.section_id = s.id
        WHERE ul.user_id = OLD.user_id AND s.course_id = course_id_var;

        -- Обновляем lessons_num_fin и progress
        UPDATE user_courses
        SET lessons_num_fin = completed_lessons,
            progress = CASE
                WHEN total_lessons > 0 THEN CEIL((completed_lessons::DECIMAL / total_lessons) * 100)
                ELSE 0
            END
        WHERE user_id = OLD.user_id AND course_id = course_id_var;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для обновления прогресса при удалении урока
DROP TRIGGER IF EXISTS trg_update_user_progress_on_delete ON user_lessons;

CREATE TRIGGER trg_update_user_progress_on_delete
AFTER DELETE ON user_lessons
FOR EACH ROW
EXECUTE FUNCTION update_user_progress_on_delete();

-- Функция для пересчёта прогресса всех пользователей в курсе
CREATE OR REPLACE FUNCTION recalculate_all_user_progress()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    total_lessons INT;
BEGIN
    -- Получаем общее количество уроков для курса
    SELECT c.lessons_count INTO total_lessons
    FROM courses c
    WHERE c.id = (SELECT s.course_id FROM sections s WHERE s.id = COALESCE(NEW.section_id, OLD.section_id));

    -- Обходим всех пользователей, подписанных на этот курс
    FOR user_record IN
        SELECT user_id FROM user_courses
        WHERE course_id = (SELECT s.course_id FROM sections s WHERE s.id = COALESCE(NEW.section_id, OLD.section_id))
    LOOP
        -- Обновляем количество пройденных уроков
        UPDATE user_courses
        SET lessons_num_fin = (
            SELECT COUNT(*)
            FROM user_lessons ul
            JOIN lessons l ON ul.lesson_id = l.id
            JOIN sections s ON l.section_id = s.id
            WHERE ul.user_id = user_record.user_id
              AND s.course_id = (SELECT s.course_id FROM sections s WHERE s.id = COALESCE(NEW.section_id, OLD.section_id))
        ),
        progress = CASE
            WHEN total_lessons > 0 THEN CEIL((
                SELECT COUNT(*)
                FROM user_lessons ul
                JOIN lessons l ON ul.lesson_id = l.id
                JOIN sections s ON l.section_id = s.id
                WHERE ul.user_id = user_record.user_id
                  AND s.course_id = (SELECT s.course_id FROM sections s WHERE s.id = COALESCE(NEW.section_id, OLD.section_id))
            )::DECIMAL / total_lessons * 100)
            ELSE 0
        END
        WHERE user_id = user_record.user_id
          AND course_id = (SELECT s.course_id FROM sections s WHERE s.id = COALESCE(NEW.section_id, OLD.section_id));
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для пересчёта прогресса при добавлении или удалении урока
DROP TRIGGER IF EXISTS trg_recalculate_all_user_progress ON lessons;

CREATE TRIGGER trg_recalculate_all_user_progress
AFTER INSERT OR DELETE ON lessons
FOR EACH ROW
EXECUTE FUNCTION recalculate_all_user_progress();

-- функция удаления всех пройденных уроков при отписке от курса 
CREATE OR REPLACE FUNCTION delete_user_lessons_on_course_remove()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM user_lessons
    WHERE user_id = OLD.user_id
      AND lesson_id IN (
          SELECT l.id
          FROM lessons l
          JOIN sections s ON l.section_id = s.id
          WHERE s.course_id = OLD.course_id
      );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер, если существует
DROP TRIGGER IF EXISTS trg_delete_user_lessons_on_course_remove ON user_courses;

-- Создаем новый триггер
CREATE TRIGGER trg_delete_user_lessons_on_course_remove
AFTER DELETE ON user_courses
FOR EACH ROW
EXECUTE FUNCTION delete_user_lessons_on_course_remove();

-- Функция для обновления количества подписчиков
CREATE OR REPLACE FUNCTION update_course_subscribers()
RETURNS TRIGGER AS $$
BEGIN
    -- Увеличиваем количество подписчиков при добавлении
    IF TG_OP = 'INSERT' THEN
        UPDATE courses
        SET subscribers = subscribers + 1
        WHERE id = NEW.course_id;
    -- Уменьшаем количество подписчиков при удалении
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses
        SET subscribers = subscribers - 1
        WHERE id = OLD.course_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старые триггеры, если существуют
DROP TRIGGER IF EXISTS trg_update_course_subscribers_insert ON user_courses;
DROP TRIGGER IF EXISTS trg_update_course_subscribers_delete ON user_courses;

-- Создаем триггер для увеличения подписчиков при добавлении
CREATE TRIGGER trg_update_course_subscribers_insert
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION update_course_subscribers();

-- Создаем триггер для уменьшения подписчиков при удалении
CREATE TRIGGER trg_update_course_subscribers_delete
AFTER DELETE ON user_courses
FOR EACH ROW
EXECUTE FUNCTION update_course_subscribers();

-- Функция для обновления количества подписчиков
CREATE OR REPLACE FUNCTION update_course_subscribers()
RETURNS TRIGGER AS $$
BEGIN
    -- Увеличиваем количество подписчиков при добавлении
    IF TG_OP = 'INSERT' THEN
        UPDATE courses
        SET subscribers = subscribers + 1
        WHERE id = NEW.course_id;
    -- Уменьшаем количество подписчиков при удалении
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses
        SET subscribers = subscribers - 1
        WHERE id = OLD.course_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старые триггеры, если существуют
DROP TRIGGER IF EXISTS trg_update_course_subscribers_insert ON user_courses;
DROP TRIGGER IF EXISTS trg_update_course_subscribers_delete ON user_courses;

-- Создаем триггер для увеличения подписчиков при добавлении
CREATE TRIGGER trg_update_course_subscribers_insert
AFTER INSERT ON user_courses
FOR EACH ROW
EXECUTE FUNCTION update_course_subscribers();

-- Создаем триггер для уменьшения подписчиков при удалении
CREATE TRIGGER trg_update_course_subscribers_delete
AFTER DELETE ON user_courses
FOR EACH ROW
EXECUTE FUNCTION update_course_subscribers();

-- Таблица сессий чата с ИИ-ассистентом
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица сообщений чата
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Таблица часто задаваемых вопросов (FAQ)
CREATE TABLE IF NOT EXISTS faq (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

