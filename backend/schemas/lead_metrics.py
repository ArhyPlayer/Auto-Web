"""Pydantic-схемы для LeadMetrics."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LeadMetricsCreate(BaseModel):
    """Схема создания метрик лида."""
    lead_id: int
    time_on_page_seconds: int = Field(default=0, ge=0)
    buttons_clicked: Optional[List[Any]] = Field(default_factory=list)
    cursor_positions: Optional[List[Any]] = Field(default_factory=list)
    return_count: int = Field(default=0, ge=0)
    raw_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LeadMetricsUpdate(BaseModel):
    """Схема обновления метрик."""
    time_on_page_seconds: Optional[int] = Field(None, ge=0)
    buttons_clicked: Optional[List[Any]] = None
    cursor_positions: Optional[List[Any]] = None
    return_count: Optional[int] = Field(None, ge=0)
    raw_data: Optional[Dict[str, Any]] = None
