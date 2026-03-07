"""Pydantic-схемы для Lead."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class LeadSubmit(BaseModel):
    """
    Объединённая схема для отправки заявки с метриками (FE → BE).
    Один запрос создаёт lead и lead_metrics.
    """
    # Поля заявки
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    patronymic: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    business_info: Optional[str] = None
    business_niche: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=100)
    task_volume: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=100)
    business_size: Optional[str] = Field(None, max_length=100)
    need_volume: Optional[str] = Field(None, max_length=255)
    deadline: Optional[str] = Field(None, max_length=255)
    task_type: Optional[str] = Field(None, max_length=255)
    product_of_interest: Optional[str] = Field(None, max_length=255)
    budget: Optional[str] = Field(None, max_length=100)
    preferred_contact_method: Optional[str] = Field(None, max_length=255)
    convenient_time: Optional[str] = Field(None, max_length=255)
    comments: Optional[str] = None
    # Поля метрик
    time_on_page_seconds: int = Field(default=0, ge=0)
    buttons_clicked: Optional[List[Any]] = Field(default_factory=list)
    cursor_positions: Optional[List[Any]] = Field(default_factory=list)
    return_count: int = Field(default=0, ge=0)
    raw_data: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_required_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
        return v

    @field_validator("budget", mode="before")
    @classmethod
    def coerce_budget_to_str(cls, v):
        """Range input может отправить число — приводим к строке."""
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return str(int(v))
        return v


class LeadCreate(BaseModel):
    """Схема создания заявки."""
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    patronymic: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    business_info: Optional[str] = None
    business_niche: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=100)
    task_volume: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=100)
    business_size: Optional[str] = Field(None, max_length=100)
    need_volume: Optional[str] = Field(None, max_length=255)
    deadline: Optional[str] = Field(None, max_length=255)
    task_type: Optional[str] = Field(None, max_length=255)
    product_of_interest: Optional[str] = Field(None, max_length=255)
    budget: Optional[str] = Field(None, max_length=100)
    preferred_contact_method: Optional[str] = Field(None, max_length=255)
    convenient_time: Optional[str] = Field(None, max_length=255)
    comments: Optional[str] = None


class LeadUpdate(BaseModel):
    """Схема обновления заявки (все поля опциональны)."""
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    patronymic: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    business_info: Optional[str] = None
    business_niche: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=100)
    task_volume: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=100)
    business_size: Optional[str] = Field(None, max_length=100)
    need_volume: Optional[str] = Field(None, max_length=255)
    deadline: Optional[str] = Field(None, max_length=255)
    task_type: Optional[str] = Field(None, max_length=255)
    product_of_interest: Optional[str] = Field(None, max_length=255)
    budget: Optional[str] = Field(None, max_length=100)
    preferred_contact_method: Optional[str] = Field(None, max_length=255)
    convenient_time: Optional[str] = Field(None, max_length=255)
    comments: Optional[str] = None
