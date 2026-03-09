"""
FastAPI-приложение для лид-формы.
Приватный backend — доступ только через Nginx (порт не пробрасывается наружу).
Swagger/OpenAPI отключены, чтобы API не был виден снаружи.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from core.database import init_pool, close_pool, init_tables
from routes import leads, lead_metrics, admin_config, auth, behavior_metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл приложения: инициализация и закрытие пула БД."""
    await init_pool()
    await init_tables()
    yield
    await close_pool()


# Отключаем Swagger/OpenAPI, чтобы API не был виден снаружи
_docs_enabled = os.environ.get("ENABLE_DOCS", "").lower() in ("1", "true", "yes")

app = FastAPI(
    title="Lead Form API",
    description="API для приёма заявок и метрик поведения клиентов",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

# CORS — для запросов с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Ошибки валидации — понятное сообщение для пользователя."""
    errors = exc.errors()
    msg = "Проверьте заполнение формы"
    if errors:
        first = errors[0]
        loc = first.get("loc", ())
        field = loc[-1] if len(loc) > 1 else loc[0] if loc else ""
        err_msg = first.get("msg", "")
        if "required" in err_msg.lower() or "field required" in err_msg.lower():
            msg = f"Обязательное поле не заполнено: {field}"
        elif field:
            msg = f"Ошибка в поле «{field}»: {err_msg}"
    return JSONResponse(status_code=422, content={"detail": msg})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Обработка необработанных исключений — возвращаем JSON вместо 500 HTML."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Ошибка сервера. Попробуйте позже.", "error": "internal_error"},
    )


# Подключение роутов
# Nginx проксирует /api/ на backend:8000/, поэтому префикс /api уже отсекается
app.include_router(leads.router)
app.include_router(lead_metrics.router)
app.include_router(behavior_metrics.router)
app.include_router(admin_config.router)
app.include_router(auth.router)


@app.get("/health")
async def health():
    """Проверка работоспособности сервиса."""
    return {"status": "ok"}
