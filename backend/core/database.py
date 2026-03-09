"""
Драйвер подключения к PostgreSQL.
Использует asyncpg для асинхронной работы.
Параметры подключения берутся из переменной окружения DATABASE_URL.
Формат: postgresql://user:password@host:5432/dbname
"""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg


def get_database_url() -> str:
    """Читает URL подключения из окружения."""
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql://appuser:appuser@postgres:5432/appdb"
    )
    # asyncpg ожидает postgresql://, не postgres://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


# Глобальный пул соединений
_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    """Инициализация пула соединений при старте приложения."""
    global _pool
    url = get_database_url()
    _pool = await asyncpg.create_pool(
        url,
        min_size=2,
        max_size=10,
        command_timeout=60,
    )


async def close_pool() -> None:
    """Закрытие пула при остановке приложения."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Контекстный менеджер для получения соединения из пула.
    Использование:
        async with get_connection() as conn:
            await conn.execute(...)
    """
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool() first.")
    async with _pool.acquire() as conn:
        yield conn


def get_pool() -> asyncpg.Pool:
    """Возвращает текущий пул (для миграций и т.п.)."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized.")
    return _pool


async def init_tables() -> None:
    """
    Создание таблиц при первом запуске.
    Порядок: leads → lead_metrics (FK) → admin_config.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(255) NOT NULL,
                last_name VARCHAR(255) NOT NULL,
                patronymic VARCHAR(255),
                phone VARCHAR(50),
                email VARCHAR(255),
                business_info TEXT,
                business_niche VARCHAR(255),
                company_size VARCHAR(100),
                task_volume VARCHAR(255),
                role VARCHAR(100),
                business_size VARCHAR(100),
                need_volume VARCHAR(255),
                deadline VARCHAR(255),
                task_type VARCHAR(255),
                product_of_interest VARCHAR(255),
                budget VARCHAR(100),
                preferred_contact_method VARCHAR(255),
                convenient_time VARCHAR(255),
                comments TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS lead_metrics (
                id INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
                time_on_page_seconds INTEGER DEFAULT 0,
                buttons_clicked JSONB DEFAULT '[]',
                cursor_positions JSONB DEFAULT '[]',
                return_count INTEGER DEFAULT 0,
                raw_data JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admin_config (
                id SERIAL PRIMARY KEY,
                services JSONB DEFAULT '[]',
                budget_min INTEGER NOT NULL DEFAULT 0,
                budget_max INTEGER NOT NULL DEFAULT 1000000,
                budget_step INTEGER DEFAULT 10000,
                extra_config JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Сид: дефолтная конфигурация с услугами, если таблица пуста
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS behavior_metrics (
                id SERIAL PRIMARY KEY,
                application_id INTEGER NOT NULL DEFAULT 0,
                time_on_page INTEGER NOT NULL DEFAULT 0,
                buttons_clicked JSONB DEFAULT '[]',
                cursor_positions JSONB DEFAULT '[]',
                return_frequency INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        row = await conn.fetchrow("SELECT 1 FROM admin_config LIMIT 1")
        if row is None:
            await conn.execute("""
                INSERT INTO admin_config (services, budget_min, budget_max, budget_step)
                VALUES (
                    '["Консультация", "Разработка", "Поддержка", "Полная покраска кузова", "СТО", "Ремонт кузова"]'::jsonb,
                    100000, 900000, 10000
                )
            """)
