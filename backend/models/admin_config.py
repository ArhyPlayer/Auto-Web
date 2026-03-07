"""
Модель админ-конфигурации — настройки для динамического формирования интерфейса.
Услуги, диапазон бюджета и прочие опции для фронтенда.
"""
from typing import Any, Optional

from core.database import get_pool


class AdminConfig:
    """
    SQL для создания таблицы admin_config:

    CREATE TABLE admin_config (
        id SERIAL PRIMARY KEY,
        services JSONB DEFAULT '[]',
        budget_min INTEGER NOT NULL DEFAULT 0,
        budget_max INTEGER NOT NULL DEFAULT 1000000,
        budget_step INTEGER DEFAULT 10000,
        extra_config JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
    pass


# ─── CRUD операции для AdminConfig ────────────────────────────────────────────

async def create_admin_config(
    *,
    services: Optional[list] = None,
    budget_min: int = 0,
    budget_max: int = 1000000,
    budget_step: int = 10000,
    extra_config: Optional[dict] = None,
) -> dict:
    """Создать запись конфигурации."""
    import json
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO admin_config (services, budget_min, budget_max, budget_step, extra_config)
            VALUES ($1::jsonb, $2, $3, $4, $5::jsonb)
            RETURNING *
            """,
            json.dumps(services or []),
            budget_min,
            budget_max,
            budget_step,
            json.dumps(extra_config or {}),
        )
        return dict(row)


async def get_admin_config(config_id: int) -> Optional[dict]:
    """Получить конфигурацию по ID."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM admin_config WHERE id = $1", config_id
        )
        return dict(row) if row else None


async def get_active_admin_config() -> Optional[dict]:
    """Получить активную конфигурацию для фронтенда.
    Объединяет услуги из ВСЕХ записей admin_config через один SQL-запрос.
    """
    import json
    pool = get_pool()
    async with pool.acquire() as conn:
        # Сначала получаем все строки и собираем услуги в Python — надёжнее, чем jsonb_agg(DISTINCT)
        rows = await conn.fetch(
            "SELECT id, services, budget_min, budget_max, budget_step, extra_config, created_at, updated_at "
            "FROM admin_config ORDER BY id"
        )
        if not rows:
            return None

        seen = set()
        all_services = []
        budget_min_val = None
        budget_max_val = None
        budget_step_val = None
        last_row = None

        for r in rows:
            last_row = r
            svc = r.get("services")
            if isinstance(svc, str):
                try:
                    arr = json.loads(svc) if svc else []
                except Exception:
                    arr = []
            elif isinstance(svc, list):
                arr = svc
            else:
                arr = []
            for item in arr:
                s = item if isinstance(item, str) else (item.get("name") or item.get("label") or str(item))
                if s and s not in seen:
                    seen.add(s)
                    all_services.append(s)

            bmin = r.get("budget_min")
            bmax = r.get("budget_max")
            bstep = r.get("budget_step")
            if bmin is not None and (budget_min_val is None or bmin < budget_min_val):
                budget_min_val = bmin
            if bmax is not None and (budget_max_val is None or bmax > budget_max_val):
                budget_max_val = bmax
            if bstep is not None and bstep > 0:
                budget_step_val = bstep

        data = dict(last_row)
        data["services"] = sorted(all_services)
        data["budget_min"] = budget_min_val if budget_min_val is not None else 0
        data["budget_max"] = budget_max_val if budget_max_val is not None else 1000000
        data["budget_step"] = budget_step_val if budget_step_val is not None else 10000
        return data


async def get_all_admin_configs(skip: int = 0, limit: int = 100) -> list[dict]:
    """Получить все конфигурации."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM admin_config ORDER BY id DESC OFFSET $1 LIMIT $2",
            skip, limit
        )
        return [dict(r) for r in rows]


async def update_admin_config(config_id: int, **kwargs) -> Optional[dict]:
    """Обновить конфигурацию."""
    allowed = {"services", "budget_min", "budget_max", "budget_step", "extra_config"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return await get_admin_config(config_id)

    import json
    set_parts = []
    values = []
    for i, (k, v) in enumerate(updates.items(), 1):
        if k in ("services", "extra_config"):
            set_parts.append(f"{k} = ${i}::jsonb")
            values.append(json.dumps(v) if isinstance(v, (list, dict)) else v)
        else:
            set_parts.append(f"{k} = ${i}")
            values.append(v)
    values.append(config_id)
    set_clause = ", ".join(set_parts)
    set_clause += ", updated_at = CURRENT_TIMESTAMP"

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE admin_config SET {set_clause} WHERE id = ${len(values)} RETURNING *",
            *values
        )
        return dict(row) if row else None


async def delete_admin_config(config_id: int) -> bool:
    """Удалить конфигурацию."""
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM admin_config WHERE id = $1", config_id)
        return result == "DELETE 1"
