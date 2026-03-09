-- SQL для создания таблицы admins в PostgreSQL
-- Используется для авторизации в админ-панели (JWT, логин/пароль)

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по логину (UNIQUE уже создаёт индекс)
-- CREATE UNIQUE INDEX IF NOT EXISTS admins_username_idx ON admins(username);
