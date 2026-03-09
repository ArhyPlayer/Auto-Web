# Auto-Web

Docker-инфраструктура для web-сервиса сбора лид-заявок.  
Все данные обрабатываются и хранятся строго внутри контура сервера.

## Сервисы

| Сервис   | Образ                 | Порт           | Описание                                    |
| -------- | --------------------- | -------------- | ------------------------------------------- |
| **nginx** | `nginx:alpine`        | `80`           | Единственная точка входа. Сайт + API по `/api/` |
| **postgres** | `postgres:16-alpine` | — (внутренний) | База данных, изолирована в `db_net`          |
| **backend** | `./backend` (build) | — (внутренний) | FastAPI, доступ только через Nginx по `/api/` |

pgAdmin, Docker Registry и Watchtower отключены. API скрыт от внешнего доступа, Swagger/OpenAPI по умолчанию выключены.

## Сетевая изоляция

```
Internet
    │
    ▼
  Nginx (порт 80)
    │
    │ /     ───► SPA (лид-форма, админ-панель)
    │ /api/ ───► backend (frontend_net)
    │                    │
    │               db_net (internal)
    │                    │
    │                 postgres
```

- `frontend_net` — Nginx, backend. Порт backend не пробрасывается наружу.
- `db_net` — postgres, backend (`internal: true`).

## Быстрый старт

### 1. Настройка окружения

```bash
cp .env.example .env
nano .env   # заполнить POSTGRES_PASSWORD, JWT_SECRET
```

### 2. Запуск

```bash
docker compose up -d
```

### 3. Сборка фронтенда

```bash
cd frontend
npm install
npm run build
```

Сборка выводит файлы в `nginx/html/`. Обновите страницу — лид-форма доступна на главной.

### 4. Админ-панель

- **URL:** `http://<server>/admin`
- При первом входе: регистрация (если админов ещё нет)
- Логин и пароль хранятся в таблице `admins`

## Backend API

Доступ только через Nginx по префиксу `/api/`. Swagger по умолчанию **выключен** (`ENABLE_DOCS=0`). Для включения: `ENABLE_DOCS=1` в `.env`, перезапуск backend.

### Эндпоинты

| Группа | Метод | Путь | Описание |
| ------ | ----- | ---- | -------- |
| **leads** | POST | `/api/leads/submit` | Отправка заявки с метриками (для формы) |
| | GET | `/api/leads` | Список заявок (JWT) |
| | GET/PATCH/DELETE | `/api/leads/{id}` | CRUD заявки |
| **lead-metrics** | POST/GET/PATCH/DELETE | `/api/lead-metrics` | Метрики поведения лида (связаны с lead) |
| **behavior-metrics** | POST | `/api/behavior-metrics` | Снимок метрик (время, клики, курсор) — раз в секунду с фронта |
| | GET | `/api/behavior-metrics` | Список (для heatmap и статистики) |
| | GET/PUT/DELETE | `/api/behavior-metrics/{id}` | CRUD метрик |
| **admin-config** | GET | `/api/admin-config/active` | Активная конфигурация (услуги, бюджет) — для формы |
| | GET/POST/PATCH/DELETE | `/api/admin-config` | CRUD конфигурации (JWT) |
| **auth** | GET | `/api/auth/can-register` | Разрешена ли регистрация |
| | POST | `/api/auth/login` | Вход, возвращает `access_token` |
| | POST | `/api/auth/register` | Регистрация первого админа |
| | GET | `/api/auth/me` | Текущий админ (JWT) |

### Модели данных

| Таблица | Описание |
| ------- | -------- |
| **leads** | Заявки: ФИО, контакты, бизнес, задача, бюджет |
| **lead_metrics** | Метрики формы (связь 1:1 с lead): время на странице, клики, курсор |
| **behavior_metrics** | Анонимные снимки метрик для heatmap (время, клики, позиции курсора) |
| **admin_config** | Услуги (JSONB), budget_min, budget_max, budget_step |
| **admins** | Администраторы: логин, password_hash (bcrypt) |

## Frontend

React + Vite. Два приложения в одном SPA:
- **Главная** (`/`) — лид-форма, сбор метрик поведения (время, клики, курсор раз в секунду)
- **Админ-панель** (`/admin`) — JWT, CRUD услуг, список заявок с интеллектуальным анализом, статистика

### Услуги из базы

Список услуг в форме берётся из `admin_config`. Редактирование — в админ-панели (блок «Услуги», таблица с кнопками Добавить / Изменить / Удалить).

### Интеллектуальный анализ лидов

В админ-панели:
- **Статистика:** общее число заявок, горячие / тёплые / холодные
- **Таблица:** приоритет, клиент, компания, бюджет, температура, отдел (VIP/Общий), кнопка «Просмотр»
- **Карточка заявки:** температура (баллы), срочность, рекомендации (персональный менеджер, стоит потратить время), контакты, компания, детали заказа
- **Модальное окно «Статистика»:** среднее/макс время на странице за день/неделю/месяц, хитмап позиций курсора

## Структура проекта

```
.
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── App.jsx         # Лид-форма
│   │   ├── AdminApp.jsx     # Админ-панель
│   │   ├── main.jsx        # Роутинг по pathname
│   │   ├── useBehaviorMetrics.js
│   │   ├── utils/leadScoring.js
│   │   └── components/
│   │       ├── LeadForm.jsx, FloatingCircles.jsx
│   │       ├── AdminLogin.jsx, AdminDashboard.jsx
│   │       ├── AdminServicesTable.jsx   # CRUD admin_config
│   │       ├── AdminLeadsTable.jsx      # Таблица заявок
│   │       ├── AdminLeadDetailModal.jsx # Карточка заявки
│   │       └── AdminStatsModal.jsx      # Статистика + heatmap
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── main.py
│   ├── core/               # database, auth (JWT, bcrypt)
│   ├── models/             # lead, lead_metrics, admin_config, admins, behavior_metrics
│   ├── routes/
│   ├── schemas/
│   ├── Dockerfile
│   └── requirements.txt
├── nginx/
│   ├── conf.d/app.conf
│   └── html/               # Сборка frontend
├── scripts/
│   └── seed_test_leads.sql # 10 тестовых заявок (4 горячих, 3 средних, 3 холодных)
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Тестовые данные

```bash
# Через Docker (если postgres в контейнере)
docker compose exec postgres psql -U appuser -d appdb -f - < scripts/seed_test_leads.sql

# Или в pgAdmin / psql при прямом доступе к БД
psql -U appuser -d appdb -f scripts/seed_test_leads.sql
```

## Отладка

```bash
# Логи backend
docker compose logs -f backend

# Проверка API
curl -X POST http://localhost/api/leads/submit \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Тест","product_of_interest":"Услуга"}'

# Проверка health
curl http://localhost/api/health
```

## Управление

```bash
# Остановить
docker compose down

# Пересоздать с удалением orphan-контейнеров
docker compose up -d --remove-orphans

# Пересборка backend
docker compose up -d --build backend

# Логи
docker compose logs -f nginx
docker compose logs -f backend
```

## Лицензия

MIT
