# Infrastructure

Docker-инфраструктура для сервиса сбора лид-заявок.  
Все данные обрабатываются и хранятся строго внутри контура сервера.

## Сервисы

| Сервис | Образ | Порт | Описание |
|---|---|---|---|
| **nginx** | `nginx:alpine` | `80`, `8080` | Единственная точка входа. Порт 80 — сайт, порт 8080 — pgAdmin |
| **postgres** | `postgres:16-alpine` | — (внутренний) | База данных, изолирована в `db_net` |
| **pgadmin** | `dpage/pgadmin4` | через `8080` | Веб-интерфейс PostgreSQL |
| **registry** | `registry:2` | `5000` | Приватный Docker-реестр с htpasswd-аутентификацией |
| **watchtower** | `containrrr/watchtower` | — | Авто-обновление контейнеров (ежедневно в 04:00 МСК) |
| **backend** | `./backend` (build) | — (внутренний) | FastAPI, доступ только через Nginx по `/api/` |

## Сетевая изоляция

```
Internet
    │
    ▼
  Nginx  ──────────► pgAdmin
    │                   │
    │ /api/          db_net (internal)
    ▼                   │
  backend  ◄────────────┤
                        │
                    postgres
```

- `frontend_net` — Nginx, pgAdmin, backend (bridge)
- `db_net` — postgres, pgAdmin, backend (`internal: true`, нет выхода наружу)
- `registry_net` — registry (bridge)

## Быстрый старт

### 1. Настройка окружения

```bash
cp .env.example .env
nano .env          # заполнить все пароли
```

### 2. Создание htpasswd для Registry

```bash
# Установить apache2-utils (если не установлен)
apt-get install -y apache2-utils

# Сгенерировать файл (bcrypt)
htpasswd -Bbn <REGISTRY_USER> <REGISTRY_PASSWORD> > registry/auth/htpasswd
```

### 3. Запуск

```bash
docker compose up -d
```

### 4. Проверка

```bash
docker compose ps
```

## Docker Registry

Registry доступен по `http://<server-ip>:5000`.  
Поскольку используется HTTP (не HTTPS), на **локальной машине** нужно добавить сервер в список insecure-registries.

**Linux** — `/etc/docker/daemon.json`:
```json
{ "insecure-registries": ["<server-ip>:5000"] }
```

**Windows / macOS** — Docker Desktop → Settings → Docker Engine, то же самое.

После изменения перезапустить Docker.

```bash
# Авторизация
docker login <server-ip>:5000

# Тег и пуш образа бэкенда
docker tag backend:latest <server-ip>:5000/backend:latest
docker push <server-ip>:5000/backend:latest
```

## Backend API

FastAPI-приложение в `backend/`. Доступ только через Nginx по префиксу `/api/` (порт не пробрасывается наружу).

**Эндпоинты:**
- `GET /api/health` — проверка работоспособности
- `POST /api/leads/submit` — отправка заявки с метриками (единый пакет от FE)
- `GET/POST/PATCH/DELETE /api/leads` — CRUD заявок
- `GET/POST/PATCH/DELETE /api/lead-metrics` — CRUD метрик поведения
- `GET /api/admin-config/active` — активная конфигурация для фронтенда (услуги, бюджет)
- `GET/POST/PATCH/DELETE /api/admin-config` — CRUD админ-конфигурации

**Swagger:** `http://<server>/api/docs`

### Модели данных

- **Lead** — заявка (имя, контакты, бизнес, задача, бюджет)
- **LeadMetrics** — метрики поведения (время на странице, клики, позиции курсора)
- **AdminConfig** — настройки для фронта: список услуг (JSONB), диапазон бюджета

## Frontend

React-приложение в `frontend/`. Сборка выводит файлы в `nginx/html/` — они сразу отдаются Nginx.

```bash
cd frontend
npm install
npm run build
```

Или через Docker (если npm не установлен):

```bash
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
```

После сборки обновите страницу — лид-форма с анимацией золотых кругов будет доступна на главной.

### Услуги из базы данных

Список услуг в выпадающем списке формы берётся из таблицы `admin_config` в PostgreSQL. Настройка через pgAdmin (`http://<server>:8080`):

1. Подключиться к серверу postgres
2. Таблица `public.admin_config` → колонка `services` (JSONB)
3. Формат: `["Услуга 1", "Услуга 2", ...]`
4. Эндпоинт `GET /api/admin-config/active` объединяет услуги из всех записей

## Структура файлов

```
app/
├── frontend/               # React + Vite, лид-форма
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── LeadForm.jsx
│   │   │   └── FloatingCircles.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── .env                    # секреты (не в git)
├── .env.example            # шаблон окружения
├── backend/
│   ├── main.py             # FastAPI app
│   ├── core/database.py    # PostgreSQL (asyncpg)
│   ├── models/             # Модели + CRUD
│   ├── routes/             # Роуты API
│   ├── schemas/            # Pydantic-схемы
│   ├── Dockerfile
│   └── requirements.txt
├── nginx/
│   ├── conf.d/
│   │   └── app.conf        # конфиг Nginx
│   ├── html/
│   │   ├── index.html      # SPA (сборка из frontend)
│   │   └── assets/         # JS/CSS бандлы
│   └── ssl/                # сертификаты (не в git)
└── registry/
    └── auth/
        └── htpasswd        # пароли registry (не в git)
```

## Отладка

```bash
# Логи backend при ошибках отправки заявки
docker logs -f backend

# Проверка API
curl -X POST http://localhost/api/leads/submit \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Тест","product_of_interest":"Услуга"}'
```

## Отладка

```bash
# Логи backend при ошибках отправки заявки
docker logs -f backend

# Проверка API с сервера
curl -X POST http://localhost/api/leads/submit \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Тест","product_of_interest":"ТО"}'
```

## Отладка

```bash
# Логи backend при ошибках отправки заявки
docker logs -f backend

# Проверка API с сервера
curl -X POST http://localhost/api/leads/submit -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Тест","product_of_interest":"Услуга"}'
```

## Отладка

```bash
# Логи backend при ошибках отправки заявки
docker logs -f backend

# Проверка API с сервера
curl -X POST http://localhost/api/leads/submit \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Тест","product_of_interest":"ТО"}'
```

## Отладка

```bash
# Логи backend при ошибках отправки заявки
docker logs -f backend

# Проверка API с сервера
curl -X POST http://localhost/api/leads/submit \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Тест","product_of_interest":"ТО"}'
```

## Управление

```bash
# Остановить всё
docker compose down

# Пересоздать конкретный сервис
docker compose up -d --force-recreate nginx

# Логи
docker compose logs -f <service>

# Статус и потребление памяти
docker stats --no-stream
```
