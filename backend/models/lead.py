"""
Модель заявки (Lead) — основная форма для тёплых клиентов.
"""
from datetime import datetime
from typing import Optional

from core.database import get_pool


class Lead:
    """
    SQL для создания таблицы leads:

    CREATE TABLE leads (
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
    );
    """
    pass


# ─── CRUD операции для Lead ───────────────────────────────────────────────────

async def create_lead(
    *,
    first_name: str,
    last_name: str,
    patronymic: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    business_info: Optional[str] = None,
    business_niche: Optional[str] = None,
    company_size: Optional[str] = None,
    task_volume: Optional[str] = None,
    role: Optional[str] = None,
    business_size: Optional[str] = None,
    need_volume: Optional[str] = None,
    deadline: Optional[str] = None,
    task_type: Optional[str] = None,
    product_of_interest: Optional[str] = None,
    budget: Optional[str] = None,
    preferred_contact_method: Optional[str] = None,
    convenient_time: Optional[str] = None,
    comments: Optional[str] = None,
) -> dict:
    """Создать новую заявку."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO leads (
                first_name, last_name, patronymic, phone, email,
                business_info, business_niche, company_size, task_volume, role,
                business_size, need_volume, deadline, task_type, product_of_interest,
                budget, preferred_contact_method, convenient_time, comments
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING id, first_name, last_name, patronymic, phone, email,
                business_info, business_niche, company_size, task_volume, role,
                business_size, need_volume, deadline, task_type, product_of_interest,
                budget, preferred_contact_method, convenient_time, comments, created_at
            """,
            first_name, last_name, patronymic, phone, email,
            business_info, business_niche, company_size, task_volume, role,
            business_size, need_volume, deadline, task_type, product_of_interest,
            budget, preferred_contact_method, convenient_time, comments,
        )
        return dict(row)


async def get_lead(lead_id: int) -> Optional[dict]:
    """Получить заявку по ID."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM leads WHERE id = $1", lead_id
        )
        return dict(row) if row else None


async def get_leads(skip: int = 0, limit: int = 100) -> list[dict]:
    """Получить список заявок с пагинацией."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM leads ORDER BY created_at DESC OFFSET $1 LIMIT $2",
            skip, limit
        )
        return [dict(r) for r in rows]


async def update_lead(lead_id: int, **kwargs) -> Optional[dict]:
    """Обновить заявку."""
    allowed = {
        "first_name", "last_name", "patronymic", "phone", "email",
        "business_info", "business_niche", "company_size", "task_volume", "role",
        "business_size", "need_volume", "deadline", "task_type", "product_of_interest",
        "budget", "preferred_contact_method", "convenient_time", "comments",
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return await get_lead(lead_id)

    set_clause = ", ".join(f"{k} = ${i}" for i, k in enumerate(updates, 1))
    values = list(updates.values()) + [lead_id]

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE leads SET {set_clause} WHERE id = ${len(values)} RETURNING *",
            *values
        )
        return dict(row) if row else None


async def delete_lead(lead_id: int) -> bool:
    """Удалить заявку."""
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM leads WHERE id = $1", lead_id)
        return result == "DELETE 1"
