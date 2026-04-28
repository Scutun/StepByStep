-- Файл с моковыми данными для образовательной платформы StepByStep.
-- Создает: словари (difficulties, tags, photos), 3 админов,
-- двух учителей, одного ученика, 3 курса (JavaScript, Python, SQL),
-- по 2 раздела в каждом, по 2 урока + 1 тест в каждом разделе,
-- подписку ученика, отзывы и базу FAQ.
-- Хэши паролей соответствуют тому же значению, что и у admin-пользователей.

-- ============== Словарь уровней сложности ==============
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM difficulties WHERE name = 'Легкая') THEN
        INSERT INTO difficulties (name) VALUES ('Легкая');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM difficulties WHERE name = 'Средняя') THEN
        INSERT INTO difficulties (name) VALUES ('Средняя');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM difficulties WHERE name = 'Сложная') THEN
        INSERT INTO difficulties (name) VALUES ('Сложная');
    END IF;
END $$;

-- ============== Словарь тегов ==============
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'JavaScript') THEN
        INSERT INTO tags (name) VALUES ('JavaScript');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Python') THEN
        INSERT INTO tags (name) VALUES ('Python');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'SQL') THEN
        INSERT INTO tags (name) VALUES ('SQL');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'HTML/CSS') THEN
        INSERT INTO tags (name) VALUES ('HTML/CSS');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Алгоритмы') THEN
        INSERT INTO tags (name) VALUES ('Алгоритмы');
    END IF;
END $$;

-- ============== Словарь аватаров ==============
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM photos WHERE name = 'defaultAvatar.jpg') THEN
        INSERT INTO photos (name) VALUES ('defaultAvatar.jpg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM photos WHERE name = 'jsAvatar.jpg') THEN
        INSERT INTO photos (name) VALUES ('jsAvatar.jpg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM photos WHERE name = 'pythonAvatar.jpg') THEN
        INSERT INTO photos (name) VALUES ('pythonAvatar.jpg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM photos WHERE name = 'sqlAvatar.jpg') THEN
        INSERT INTO photos (name) VALUES ('sqlAvatar.jpg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM photos WHERE name = 'codeAvatar.jpg') THEN
        INSERT INTO photos (name) VALUES ('codeAvatar.jpg');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM photos WHERE name = 'algorithmsAvatar.jpg') THEN
        INSERT INTO photos (name) VALUES ('algorithmsAvatar.jpg');
    END IF;
END $$;

-- ============== Администраторы ==============
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin1@mail.ru') THEN
        INSERT INTO users (email, password, nickname, name, surname, activated, registration_date)
        VALUES ('admin1@mail.ru', '$2b$10$qClaDFhQzCCFB4c6TkRxmecmGIXV75a2YO1Rf3cfRslY88zZnNieS', 'admin1', 'admin1', 'admin1', TRUE, NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin2@mail.ru') THEN
        INSERT INTO users (email, password, nickname, name, surname, activated, registration_date)
        VALUES ('admin2@mail.ru', '$2b$10$qClaDFhQzCCFB4c6TkRxmecmGIXV75a2YO1Rf3cfRslY88zZnNieS', 'admin2', 'admin2', 'admin2', TRUE, NOW());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin3@mail.ru') THEN
        INSERT INTO users (email, password, nickname, name, surname, activated, registration_date)
        VALUES ('admin3@mail.ru', '$2b$10$qClaDFhQzCCFB4c6TkRxmecmGIXV75a2YO1Rf3cfRslY88zZnNieS', 'admin3', 'admin3', 'admin3', TRUE, NOW());
    END IF;
END $$;

-- ============== Преподаватели, ученик, курсы, разделы, уроки ==============
DO $$
DECLARE
    teacher1_id INT;
    teacher2_id INT;
    student_id  INT;

    js_course_id  INT;
    py_course_id  INT;
    sql_course_id INT;

    js_section1_id  INT;
    js_section2_id  INT;
    py_section1_id  INT;
    py_section2_id  INT;
    sql_section1_id INT;
    sql_section2_id INT;

    diff_easy_id   INT;
    diff_medium_id INT;
    diff_hard_id   INT;

    tag_js_id   INT;
    tag_py_id   INT;
    tag_sql_id  INT;
    tag_html_id INT;
    tag_algo_id INT;
BEGIN
    SELECT id INTO diff_easy_id   FROM difficulties WHERE name = 'Легкая';
    SELECT id INTO diff_medium_id FROM difficulties WHERE name = 'Средняя';
    SELECT id INTO diff_hard_id   FROM difficulties WHERE name = 'Сложная';

    SELECT id INTO tag_js_id   FROM tags WHERE name = 'JavaScript';
    SELECT id INTO tag_py_id   FROM tags WHERE name = 'Python';
    SELECT id INTO tag_sql_id  FROM tags WHERE name = 'SQL';
    SELECT id INTO tag_html_id FROM tags WHERE name = 'HTML/CSS';
    SELECT id INTO tag_algo_id FROM tags WHERE name = 'Алгоритмы';

    -- Учитель 1 — ведёт курсы по JavaScript и Python
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'teacher@mail.ru') THEN
        INSERT INTO users (email, password, nickname, name, surname, activated, registration_date)
        VALUES (
            'teacher@mail.ru',
            '$2b$10$qClaDFhQzCCFB4c6TkRxmecmGIXV75a2YO1Rf3cfRslY88zZnNieS',
            'teacher',
            'Иван',
            'Преподавателев',
            TRUE,
            NOW()
        )
        RETURNING id INTO teacher1_id;
    ELSE
        SELECT id INTO teacher1_id FROM users WHERE email = 'teacher@mail.ru';
    END IF;

    -- Учитель 2 — ведёт курс по SQL
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'teacher2@mail.ru') THEN
        INSERT INTO users (email, password, nickname, name, surname, activated, registration_date)
        VALUES (
            'teacher2@mail.ru',
            '$2b$10$qClaDFhQzCCFB4c6TkRxmecmGIXV75a2YO1Rf3cfRslY88zZnNieS',
            'teacher2',
            'Мария',
            'Учителева',
            TRUE,
            NOW()
        )
        RETURNING id INTO teacher2_id;
    ELSE
        SELECT id INTO teacher2_id FROM users WHERE email = 'teacher2@mail.ru';
    END IF;

    -- Ученик
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@mail.ru') THEN
        INSERT INTO users (email, password, nickname, name, surname, activated, registration_date)
        VALUES (
            'student@mail.ru',
            '$2b$10$qClaDFhQzCCFB4c6TkRxmecmGIXV75a2YO1Rf3cfRslY88zZnNieS',
            'student',
            'Пётр',
            'Учеников',
            TRUE,
            NOW()
        )
        RETURNING id INTO student_id;
    ELSE
        SELECT id INTO student_id FROM users WHERE email = 'student@mail.ru';
    END IF;

    -- Курс 1: JavaScript с нуля (teacher1)
    IF NOT EXISTS (SELECT 1 FROM courses WHERE title = 'JavaScript с нуля') THEN
        INSERT INTO courses (title, description, creator_id, creation_date, course_duration, difficulty_id, course_photo)
        VALUES (
            'JavaScript с нуля',
            'Базовый курс по JavaScript: переменные, функции, объекты, работа с DOM и асинхронность.',
            teacher1_id,
            NOW(),
            12,
            diff_easy_id,
            'jsAvatar.jpg'
        )
        RETURNING id INTO js_course_id;

        INSERT INTO course_tags (course_id, tag_id) VALUES
            (js_course_id, tag_js_id),
            (js_course_id, tag_html_id);
    ELSE
        SELECT id INTO js_course_id FROM courses WHERE title = 'JavaScript с нуля';
    END IF;

    -- Курс 2: Python для начинающих (teacher1)
    IF NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Python для начинающих') THEN
        INSERT INTO courses (title, description, creator_id, creation_date, course_duration, difficulty_id, course_photo)
        VALUES (
            'Python для начинающих',
            'Знакомство с Python: синтаксис, структуры данных, функции, ООП и работа с файлами.',
            teacher1_id,
            NOW(),
            16,
            diff_medium_id,
            'pythonAvatar.jpg'
        )
        RETURNING id INTO py_course_id;

        INSERT INTO course_tags (course_id, tag_id) VALUES
            (py_course_id, tag_py_id),
            (py_course_id, tag_algo_id);
    ELSE
        SELECT id INTO py_course_id FROM courses WHERE title = 'Python для начинающих';
    END IF;

    -- Курс 3: SQL и базы данных (teacher2)
    IF NOT EXISTS (SELECT 1 FROM courses WHERE title = 'SQL и базы данных') THEN
        INSERT INTO courses (title, description, creator_id, creation_date, course_duration, difficulty_id, course_photo)
        VALUES (
            'SQL и базы данных',
            'Курс по реляционным базам данных и SQL: SELECT, JOIN, агрегатные функции, проектирование схем.',
            teacher2_id,
            NOW(),
            10,
            diff_medium_id,
            'sqlAvatar.jpg'
        )
        RETURNING id INTO sql_course_id;

        INSERT INTO course_tags (course_id, tag_id) VALUES
            (sql_course_id, tag_sql_id);
    ELSE
        SELECT id INTO sql_course_id FROM courses WHERE title = 'SQL и базы данных';
    END IF;

    -- Разделы курса JavaScript
    INSERT INTO sections (name, course_id) VALUES ('Введение в JavaScript', js_course_id)
        ON CONFLICT (name, course_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO js_section1_id;

    INSERT INTO sections (name, course_id) VALUES ('Функции и объекты', js_course_id)
        ON CONFLICT (name, course_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO js_section2_id;

    -- Разделы курса Python
    INSERT INTO sections (name, course_id) VALUES ('Основы Python', py_course_id)
        ON CONFLICT (name, course_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO py_section1_id;

    INSERT INTO sections (name, course_id) VALUES ('Структуры данных', py_course_id)
        ON CONFLICT (name, course_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO py_section2_id;

    -- Разделы курса SQL
    INSERT INTO sections (name, course_id) VALUES ('Основы SQL', sql_course_id)
        ON CONFLICT (name, course_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO sql_section1_id;

    INSERT INTO sections (name, course_id) VALUES ('Соединения и агрегации', sql_course_id)
        ON CONFLICT (name, course_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO sql_section2_id;

    -- Уроки и тесты. Флаг is_test=true означает тест.
    -- Вставляем только если в разделе еще нет уроков, чтобы повторный запуск не дублировал.
    IF NOT EXISTS (SELECT 1 FROM lessons WHERE section_id = js_section1_id) THEN
        INSERT INTO lessons (name, is_test, section_id) VALUES
            ('Что такое JavaScript', FALSE, js_section1_id),
            ('Переменные и типы данных', FALSE, js_section1_id),
            ('Тест: основы JavaScript', TRUE,  js_section1_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM lessons WHERE section_id = js_section2_id) THEN
        INSERT INTO lessons (name, is_test, section_id) VALUES
            ('Объявление функций', FALSE, js_section2_id),
            ('Работа с объектами', FALSE, js_section2_id),
            ('Тест: функции и объекты', TRUE, js_section2_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM lessons WHERE section_id = py_section1_id) THEN
        INSERT INTO lessons (name, is_test, section_id) VALUES
            ('Установка Python и hello world', FALSE, py_section1_id),
            ('Условные операторы и циклы', FALSE, py_section1_id),
            ('Тест: основы Python', TRUE, py_section1_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM lessons WHERE section_id = py_section2_id) THEN
        INSERT INTO lessons (name, is_test, section_id) VALUES
            ('Списки и кортежи', FALSE, py_section2_id),
            ('Словари и множества', FALSE, py_section2_id),
            ('Тест: структуры данных', TRUE, py_section2_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM lessons WHERE section_id = sql_section1_id) THEN
        INSERT INTO lessons (name, is_test, section_id) VALUES
            ('Что такое реляционная БД', FALSE, sql_section1_id),
            ('Запрос SELECT и WHERE', FALSE, sql_section1_id),
            ('Тест: основы SQL', TRUE, sql_section1_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM lessons WHERE section_id = sql_section2_id) THEN
        INSERT INTO lessons (name, is_test, section_id) VALUES
            ('JOIN: соединение таблиц', FALSE, sql_section2_id),
            ('GROUP BY и агрегатные функции', FALSE, sql_section2_id),
            ('Тест: соединения и агрегации', TRUE, sql_section2_id);
    END IF;

    -- Подписка ученика на все курсы
    INSERT INTO user_courses (user_id, course_id) VALUES
        (student_id, js_course_id),
        (student_id, py_course_id),
        (student_id, sql_course_id)
    ON CONFLICT (user_id, course_id) DO NOTHING;

    -- Отзывы ученика на курсы
    INSERT INTO comments (rating, content, user_nickname, course_id) VALUES
        (5, 'Очень понятный курс, отличное введение в JavaScript!', 'student', js_course_id),
        (4, 'Хороший курс, но хотелось бы больше практики.',         'student', py_course_id)
    ON CONFLICT (user_nickname, course_id) DO NOTHING;
END $$;

-- ============== Наполнение FAQ ==============
INSERT INTO faq (question, answer, category) VALUES
('Как записаться на курс?', 'Найдите интересующий курс в каталоге, откройте его страницу и нажмите кнопку «Подписаться». Курс появится в разделе «Мои курсы».', 'Курсы'),
('Как отписаться от курса?', 'Перейдите в раздел «Мои курсы», откройте нужный курс и нажмите кнопку «Отписаться».', 'Курсы'),
('Как отслеживать прогресс обучения?', 'В разделе «Мои курсы» отображается прогресс прохождения каждого курса в процентах. Прогресс обновляется автоматически после завершения каждого урока.', 'Обучение'),
('Как завершить урок?', 'После изучения материала нажмите кнопку «Завершить урок» внизу страницы урока.', 'Обучение'),
('Как посмотреть список уроков курса?', 'Откройте страницу курса — там будет список всех разделов и уроков. Доступность урока зависит от вашей подписки на курс.', 'Обучение'),
('Как изменить личные данные?', 'Перейдите в настройки профиля и обновите нужные поля: имя, фамилию, никнейм или фото.', 'Профиль'),
('Как изменить пароль?', 'В настройках профиля перейдите в раздел «Безопасность» и введите новый пароль.', 'Профиль'),
('Как восстановить пароль?', 'На странице входа нажмите «Забыли пароль?» и следуйте инструкциям — ссылка для сброса придёт на ваш email.', 'Профиль'),
('Что такое репутация?', 'Репутация — это система очков, отражающая активность пользователя на платформе. Чем больше вы учитесь и взаимодействуете с платформой, тем выше репутация.', 'Профиль'),
('Как удалить аккаунт?', 'Удаление аккаунта доступно в настройках профиля. Учтите, что это действие необратимо — все данные будут удалены.', 'Профиль'),
('Какие уровни сложности курсов существуют?', 'На платформе доступны три уровня сложности: Легкая (для начинающих), Средняя (для тех, кто уже знаком с темой) и Сложная (для опытных пользователей).', 'Курсы'),
('Как оставить отзыв о курсе?', 'На странице курса прокрутите вниз до раздела «Отзывы» и нажмите «Написать отзыв». Выберите оценку от 1 до 5 и напишите комментарий.', 'Курсы'),
('Можно ли проходить несколько курсов одновременно?', 'Да, вы можете подписаться на любое количество курсов и проходить их в удобном для вас темпе.', 'Курсы'),
('Как найти нужный курс?', 'В каталоге курсов используйте строку поиска или фильтры по тегам и уровню сложности, чтобы найти подходящий курс.', 'Курсы'),
('Что делать, если возникла техническая проблема?', 'Если вы столкнулись с технической проблемой, попробуйте перезагрузить страницу. Если проблема сохраняется — обратитесь в службу поддержки через форму обратной связи.', 'Поддержка'),
('Как связаться с поддержкой?', 'Для связи с командой поддержки используйте форму обратной связи на сайте или напишите на официальный email платформы.', 'Поддержка')
ON CONFLICT DO NOTHING;
