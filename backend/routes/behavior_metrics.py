"""Роуты для метрик поведения (behavior-metrics)."""
from fastapi import APIRouter, HTTPException

from models import behavior_metrics as bm_crud
from schemas.behavior_metrics import BehaviorMetricsCreate, BehaviorMetricsUpdate

router = APIRouter(prefix="/behavior-metrics", tags=["behavior-metrics"])


@router.get("")
@router.get("/")
async def list_behavior_metrics(skip: int = 0, limit: int = 100, application_id: int | None = None):
    """Список метрик с пагинацией. Фильтр по application_id опционален."""
    return await bm_crud.get_all_behavior_metrics(skip=skip, limit=limit, application_id=application_id)


@router.get("/application/{application_id}")
async def list_by_application(application_id: int, skip: int = 0, limit: int = 100):
    """Метрики по application_id."""
    return await bm_crud.get_all_behavior_metrics(skip=skip, limit=limit, application_id=application_id)


@router.get("/{metrics_id}")
async def get_behavior_metrics(metrics_id: int):
    """Получить метрику по ID."""
    result = await bm_crud.get_behavior_metrics(metrics_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Метрики не найдены")
    return result


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create_behavior_metrics(data: BehaviorMetricsCreate):
    """Принять снимок метрик (время на странице, клики, позиции курсора для heatmap)."""
    return await bm_crud.create_behavior_metrics(
        application_id=data.application_id,
        time_on_page=data.time_on_page,
        buttons_clicked=data.buttons_clicked,
        cursor_positions=data.cursor_positions,
        return_frequency=data.return_frequency,
    )


@router.put("/{metrics_id}")
async def update_behavior_metrics(metrics_id: int, data: BehaviorMetricsUpdate):
    """Обновить метрику."""
    updates = data.model_dump(exclude_none=True)
    if not updates:
        result = await bm_crud.get_behavior_metrics(metrics_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Метрики не найдены")
        return result
    result = await bm_crud.update_behavior_metrics(metrics_id, **updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Метрики не найдены")
    return result


@router.delete("/{metrics_id}", status_code=204)
async def delete_behavior_metrics(metrics_id: int):
    """Удалить метрику."""
    ok = await bm_crud.delete_behavior_metrics(metrics_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Метрики не найдены")
