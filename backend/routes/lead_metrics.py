"""Роуты для работы с метриками лидов (LeadMetrics)."""
from fastapi import APIRouter, HTTPException

from models import lead_metrics as metrics_crud
from schemas.lead_metrics import LeadMetricsCreate, LeadMetricsUpdate

router = APIRouter(prefix="/lead-metrics", tags=["lead-metrics"])


@router.post("", status_code=201)
async def create_lead_metrics(data: LeadMetricsCreate):
    """Создать метрики для заявки (связь 1:1)."""
    result = await metrics_crud.create_lead_metrics(
        data.lead_id,
        time_on_page_seconds=data.time_on_page_seconds,
        buttons_clicked=data.buttons_clicked,
        cursor_positions=data.cursor_positions,
        return_count=data.return_count,
        raw_data=data.raw_data,
    )
    return result


@router.get("/{lead_id}")
async def get_lead_metrics(lead_id: int):
    """Получить метрики по ID заявки."""
    result = await metrics_crud.get_lead_metrics(lead_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Метрики не найдены")
    return result


@router.patch("/{lead_id}")
async def update_lead_metrics(lead_id: int, data: LeadMetricsUpdate):
    """Обновить метрики заявки."""
    updates = data.model_dump(exclude_none=True)
    if not updates:
        result = await metrics_crud.get_lead_metrics(lead_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Метрики не найдены")
        return result
    result = await metrics_crud.update_lead_metrics(lead_id, **updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Метрики не найдены")
    return result


@router.delete("/{lead_id}", status_code=204)
async def delete_lead_metrics(lead_id: int):
    """Удалить метрики."""
    ok = await metrics_crud.delete_lead_metrics(lead_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Метрики не найдены")
