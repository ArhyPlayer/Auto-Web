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
| **backend** | `<registry>/backend:latest` | — (внутренний) | *Не активен — раскомментировать в `docker-compose.yml`* |

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

## Структура файлов

```
app/
├── docker-compose.yml
├── .env                    # секреты (не в git)
├── .env.example            # шаблон окружения
├── nginx/
│   ├── conf.d/
│   │   └── app.conf        # конфиг Nginx
│   ├── html/
│   │   └── index.html      # заглушка / будущий фронт
│   └── ssl/                # сертификаты (не в git)
└── registry/
    └── auth/
        └── htpasswd        # пароли registry (не в git)
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
