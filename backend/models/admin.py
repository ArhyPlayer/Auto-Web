"""
Модель администратора — для входа в админ-панель.
"""
from typing import Optional

from core.database import get_pool


class Admin:
    """
    SQL для создания таблицы admins:

    CREATE TABLE admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
    pass


async def create_admin(username: str, password_hash: str) -> dict:
    """Создать администратора."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO admins (username, password_hash)
            VALUES ($1, $2)
            RETURNING id, username, created_at
            """,
            username,
            password_hash,
        )
        return dict(row)


async def get_admin_by_username(username: str) -> Optional[dict]:
    """Получить админа по логину."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, username, password_hash, created_at FROM admins WHERE username = $1",
            username,
        )
        return dict(row) if row else None


async def get_admin_by_id(admin_id: int) -> Optional[dict]:
    """Получить админа по ID (без пароля)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, username, created_at FROM admins WHERE id = $1",
            admin_id,
        )
        return dict(row) if row else None


async def _ensure_table() -> None:
    """Создать таблицу admins, если не существует."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)


async def count_admins() -> int:
    """Количество администраторов в БД."""
    pool = get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM admins") or 0
