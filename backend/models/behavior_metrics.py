"""Модель метрик поведения — анонимная статистика для heatmap и аналитики."""
from typing import Optional

from core.database import get_pool


def _safe_json(val: str, default: str = "[]") -> str:
    """Проверка и обрезка JSON-строки."""
    if not val or not isinstance(val, str):
        return default
    if len(val) > 1_000_000:  # защита от слишком больших payload
        return default
    return val


async def get_behavior_metrics(metrics_id: int) -> Optional[dict]:
    """Получить метрику по ID."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM behavior_metrics WHERE id = $1", metrics_id)
        return dict(row) if row else None


async def get_all_behavior_metrics(skip: int = 0, limit: int = 100, application_id: Optional[int] = None) -> list[dict]:
    """Получить список метрик с пагинацией и фильтром по application_id."""
    pool = get_pool()
    async with pool.acquire() as conn:
        if application_id is not None:
            rows = await conn.fetch(
                "SELECT * FROM behavior_metrics WHERE application_id = $1 ORDER BY id DESC OFFSET $2 LIMIT $3",
                application_id, skip, limit
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM behavior_metrics ORDER BY id DESC OFFSET $1 LIMIT $2", skip, limit
            )
        return [dict(r) for r in rows]


async def update_behavior_metrics(metrics_id: int, **kwargs) -> Optional[dict]:
    """Обновить метрику."""
    allowed = {"application_id", "time_on_page", "buttons_clicked", "cursor_positions", "return_frequency"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return await get_behavior_metrics(metrics_id)

    import json
    set_parts = []
    values = []
    for i, (k, v) in enumerate(updates.items(), 1):
        if k in ("buttons_clicked", "cursor_positions"):
            set_parts.append(f"{k} = ${i}::jsonb")
            values.append(_safe_json(v) if isinstance(v, str) else json.dumps(v))
        else:
            set_parts.append(f"{k} = ${i}")
            values.append(v)
    values.append(metrics_id)
    set_clause = ", ".join(set_parts)

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE behavior_metrics SET {set_clause} WHERE id = ${len(values)} RETURNING *",
            *values
        )
        return dict(row) if row else None


async def delete_behavior_metrics(metrics_id: int) -> bool:
    """Удалить метрику."""
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM behavior_metrics WHERE id = $1", metrics_id)
        return result == "DELETE 1"


async def create_behavior_metrics(
    *,
    application_id: int = 0,
    time_on_page: int = 0,
    buttons_clicked: str = "[]",
    cursor_positions: str = "[]",
    return_frequency: int = 0,
) -> dict:
    """Создать снимок метрик (отправляется раз в секунду с фронта)."""
    bc = _safe_json(buttons_clicked)
    cp = _safe_json(cursor_positions)
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO behavior_metrics (application_id, time_on_page, buttons_clicked, cursor_positions, return_frequency)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
            RETURNING *
            """,
            application_id,
            time_on_page,
            bc,
            cp,
            return_frequency,
        )
        return dict(row)
