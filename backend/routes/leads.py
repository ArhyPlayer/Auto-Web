"""Роуты для работы с заявками (Lead)."""
from fastapi import APIRouter, HTTPException

from models import lead as lead_crud
from models import lead_metrics as metrics_crud
from schemas.lead import LeadCreate, LeadUpdate, LeadSubmit

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/submit", status_code=201)
async def submit_lead_with_metrics(data: LeadSubmit):
    """
    Принять заявку + метрики в одном запросе (для фронтенда).
    Создаёт lead, затем lead_metrics с тем же ID (связь 1:1).
    """
    lead_fields = {
        "first_name", "last_name", "patronymic", "phone", "email",
        "business_info", "business_niche", "company_size", "task_volume", "role",
        "business_size", "need_volume", "deadline", "task_type", "product_of_interest",
        "budget", "preferred_contact_method", "convenient_time", "comments",
    }
    metrics_fields = {"time_on_page_seconds", "buttons_clicked", "cursor_positions", "return_count", "raw_data"}
    try:
        d = data.model_dump(exclude_none=True)
        lead_data = {k: v for k, v in d.items() if k in lead_fields}
        metrics_data = {k: v for k, v in d.items() if k in metrics_fields}
        lead = await lead_crud.create_lead(**lead_data)
        lead_id = lead["id"]
        await metrics_crud.create_lead_metrics(
            lead_id,
            time_on_page_seconds=metrics_data.get("time_on_page_seconds", 0),
            buttons_clicked=metrics_data.get("buttons_clicked"),
            cursor_positions=metrics_data.get("cursor_positions"),
            return_count=metrics_data.get("return_count", 0),
            raw_data=metrics_data.get("raw_data"),
        )
        return {"lead": lead, "lead_id": lead_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения: {str(e)}")


@router.post("", status_code=201)
async def create_lead(data: LeadCreate):
    """Создать новую заявку."""
    result = await lead_crud.create_lead(**data.model_dump(exclude_none=True))
    return result


@router.get("/{lead_id}")
async def get_lead(lead_id: int):
    """Получить заявку по ID."""
    result = await lead_crud.get_lead(lead_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return result


@router.get("")
async def list_leads(skip: int = 0, limit: int = 100):
    """Список заявок с пагинацией."""
    return await lead_crud.get_leads(skip=skip, limit=limit)


@router.patch("/{lead_id}")
async def update_lead(lead_id: int, data: LeadUpdate):
    """Обновить заявку."""
    updates = data.model_dump(exclude_none=True)
    if not updates:
        result = await lead_crud.get_lead(lead_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        return result
    result = await lead_crud.update_lead(lead_id, **updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return result


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(lead_id: int):
    """Удалить заявку."""
    ok = await lead_crud.delete_lead(lead_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
