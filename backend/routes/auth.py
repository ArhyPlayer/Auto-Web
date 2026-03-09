"""Роуты авторизации — логин, регистрация, JWT."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models import admin as admin_crud
from schemas.admin import AdminLogin, AdminRegister
from core.auth import (
    verify_password,
    hash_password,
    create_access_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Зависимость: текущий админ по JWT."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
    admin_id = int(payload["sub"])
    admin = await admin_crud.get_admin_by_id(admin_id)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    return admin


@router.get("/can-register")
async def can_register():
    """Регистрация разрешена, если в БД нет ни одного админа."""
    await admin_crud._ensure_table()
    count = await admin_crud.count_admins()
    return {"can_register": count == 0}


@router.post("/login")
async def login(data: AdminLogin):
    """Вход: логин + пароль → JWT."""
    admin = await admin_crud.get_admin_by_username(data.username)
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )
    token = create_access_token({"sub": str(admin["id"])})
    return {"access_token": token, "token_type": "bearer", "admin": {"id": admin["id"], "username": admin["username"]}}


@router.post("/register")
async def register(data: AdminRegister):
    """Регистрация: только если в БД нет ни одного админа."""
    try:
        await admin_crud._ensure_table()
        count = await admin_crud.count_admins()
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Регистрация отключена",
            )
        existing = await admin_crud.get_admin_by_username(data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь уже существует",
            )
        password_hash = hash_password(data.password)
        admin = await admin_crud.create_admin(data.username, password_hash)
        token = create_access_token({"sub": str(admin["id"])})
        return {"access_token": token, "token_type": "bearer", "admin": {"id": admin["id"], "username": admin["username"]}}
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("register failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка регистрации. Убедитесь, что backend пересобран (docker compose build backend) и перезапущен.",
        )


@router.get("/me")
async def me(current: dict = Depends(get_current_admin)):
    """Текущий авторизованный админ."""
    return current
