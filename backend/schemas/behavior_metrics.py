"""Pydantic-схема для метрик поведения (behavior-metrics)."""
from typing import Optional

from pydantic import BaseModel, Field


class BehaviorMetricsCreate(BaseModel):
    """Схема для POST /api/behavior-metrics/."""
    application_id: int = Field(default=0, ge=0)
    time_on_page: int = Field(default=0, ge=0, description="Время на странице в секундах")
    buttons_clicked: str = Field(default="[]", description="JSON-строка: массив кликов по кнопкам")
    cursor_positions: str = Field(default="[]", description="JSON-строка: массив позиций курсора (для heatmap)")
    return_frequency: int = Field(default=0, ge=0)


class BehaviorMetricsUpdate(BaseModel):
    """Схема для PUT /api/behavior-metrics/{id}."""
    application_id: Optional[int] = Field(None, ge=0)
    time_on_page: Optional[int] = Field(None, ge=0)
    buttons_clicked: Optional[str] = None
    cursor_positions: Optional[str] = None
    return_frequency: Optional[int] = Field(None, ge=0)
