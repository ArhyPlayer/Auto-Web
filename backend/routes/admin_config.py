"""Роуты для работы с админ-конфигурацией."""
from fastapi import APIRouter, Depends, HTTPException, Response

from models import admin_config as admin_crud
from schemas.admin_config import AdminConfigCreate, AdminConfigUpdate
from routes.auth import get_current_admin

router = APIRouter(prefix="/admin-config", tags=["admin-config"])


@router.post("", status_code=201)
async def create_admin_config(data: AdminConfigCreate, _: dict = Depends(get_current_admin)):
    """Создать запись конфигурации."""
    result = await admin_crud.create_admin_config(
        services=data.services,
        budget_min=data.budget_min,
        budget_max=data.budget_max,
        budget_step=data.budget_step,
        extra_config=data.extra_config,
    )
    return result


@router.get("/active")
async def get_active_config(response: Response):
    """Получить активную конфигурацию (для фронтенда)."""
    import json
    result = await admin_crud.get_active_admin_config()
    if result is None:
        raise HTTPException(status_code=404, detail="Конфигурация не найдена")
    # Нормализация: services должен быть массивом (asyncpg иногда возвращает JSONB как строку)
    svc = result.get("services")
    if isinstance(svc, str):
        try:
            result["services"] = json.loads(svc) if svc else []
        except json.JSONDecodeError:
            result["services"] = []
    elif not isinstance(svc, list):
        result["services"] = []
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    return result


@router.get("/{config_id}")
async def get_admin_config(config_id: int, _: dict = Depends(get_current_admin)):
    """Получить конфигурацию по ID."""
    result = await admin_crud.get_admin_config(config_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Конфигурация не найдена")
    return result


@router.get("")
async def list_admin_configs(skip: int = 0, limit: int = 100, _: dict = Depends(get_current_admin)):
    """Список всех конфигураций."""
    return await admin_crud.get_all_admin_configs(skip=skip, limit=limit)


@router.patch("/{config_id}")
async def update_admin_config(config_id: int, data: AdminConfigUpdate, _: dict = Depends(get_current_admin)):
    """Обновить конфигурацию."""
    updates = data.model_dump(exclude_none=True)
    if not updates:
        result = await admin_crud.get_admin_config(config_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Конфигурация не найдена")
        return result
    result = await admin_crud.update_admin_config(config_id, **updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Конфигурация не найдена")
    return result


@router.delete("/{config_id}", status_code=204)
async def delete_admin_config(config_id: int, _: dict = Depends(get_current_admin)):
    """Удалить конфигурацию."""
    ok = await admin_crud.delete_admin_config(config_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Конфигурация не найдена")
