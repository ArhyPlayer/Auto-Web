"""
Модель метрик поведения лида — данные о действиях пользователя на странице.
Связь один-к-одному с Lead (PK = FK на leads.id).
"""
from typing import Any, Optional

from core.database import get_pool


class LeadMetrics:
    """
    SQL для создания таблицы lead_metrics:

    CREATE TABLE lead_metrics (
        id INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
        time_on_page_seconds INTEGER DEFAULT 0,
        buttons_clicked JSONB DEFAULT '[]',
        cursor_positions JSONB DEFAULT '[]',
        return_count INTEGER DEFAULT 0,
        raw_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
    pass


# ─── CRUD операции для LeadMetrics ────────────────────────────────────────────

def _safe_json_dumps(obj: Any, default: str = "[]") -> str:
    """Сериализация в JSON с защитой от падения (NaN, Infinity и т.п.)."""
    import json
    if obj is None:
        return "[]" if default == "[]" else "{}"
    try:
        return json.dumps(obj, default=lambda x: str(x) if x is not None else None)
    except (TypeError, ValueError):
        return default


async def create_lead_metrics(
    lead_id: int,
    *,
    time_on_page_seconds: int = 0,
    buttons_clicked: Optional[list] = None,
    cursor_positions: Optional[list] = None,
    return_count: int = 0,
    raw_data: Optional[dict] = None,
) -> dict:
    """Создать запись метрик для заявки (связь 1:1)."""
    pool = get_pool()
    bc = _safe_json_dumps(buttons_clicked or [], "[]")
    cp = _safe_json_dumps(cursor_positions or [], "[]")
    rd = _safe_json_dumps(raw_data or {}, "{}")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO lead_metrics (id, time_on_page_seconds, buttons_clicked, cursor_positions, return_count, raw_data)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb)
            RETURNING *
            """,
            lead_id,
            time_on_page_seconds,
            bc,
            cp,
            return_count,
            rd,
        )
        return dict(row)


async def get_lead_metrics(lead_id: int) -> Optional[dict]:
    """Получить метрики по ID заявки."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM lead_metrics WHERE id = $1", lead_id
        )
        return dict(row) if row else None


async def update_lead_metrics(lead_id: int, **kwargs) -> Optional[dict]:
    """Обновить метрики заявки."""
    allowed = {
        "time_on_page_seconds", "buttons_clicked", "cursor_positions",
        "return_count", "raw_data",
    }
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return await get_lead_metrics(lead_id)

    import json
    set_parts = []
    values = []
    for i, (k, v) in enumerate(updates.items(), 1):
        if k in ("buttons_clicked", "cursor_positions", "raw_data"):
            set_parts.append(f"{k} = ${i}::jsonb")
            values.append(json.dumps(v) if isinstance(v, (list, dict)) else v)
        else:
            set_parts.append(f"{k} = ${i}")
            values.append(v)
    values.append(lead_id)
    set_clause = ", ".join(set_parts)
    set_clause += ", updated_at = CURRENT_TIMESTAMP"

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE lead_metrics SET {set_clause} WHERE id = ${len(values)} RETURNING *",
            *values
        )
        return dict(row) if row else None


async def delete_lead_metrics(lead_id: int) -> bool:
    """Удалить метрики (при удалении lead удаляются каскадно)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM lead_metrics WHERE id = $1", lead_id)
        return result == "DELETE 1"
