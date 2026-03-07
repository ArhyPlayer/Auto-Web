"""Pydantic-схемы для AdminConfig."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AdminConfigCreate(BaseModel):
    """Схема создания конфигурации."""
    services: Optional[List[Any]] = Field(default_factory=list)
    budget_min: int = Field(default=0, ge=0)
    budget_max: int = Field(default=1000000, ge=0)
    budget_step: int = Field(default=10000, ge=1)
    extra_config: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AdminConfigUpdate(BaseModel):
    """Схема обновления конфигурации."""
    services: Optional[List[Any]] = None
    budget_min: Optional[int] = Field(None, ge=0)
    budget_max: Optional[int] = Field(None, ge=0)
    budget_step: Optional[int] = Field(None, ge=1)
    extra_config: Optional[Dict[str, Any]] = None
