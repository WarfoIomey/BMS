# BMS
Это API-приложение по управление командами, задачами и встречами

## Стек технологий

![Django REST](https://img.shields.io/badge/Django%20REST-FF6F00?logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Nginx](https://img.shields.io/badge/Nginx-009639?logo=nginx&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-0A9EDC?logo=pytest&logoColor=white)


## Установка

### Клонирование репозитория

```bash
git clone https://github.com/WarfoIomey/BMS.git
cd BMS
```

## Структура проекта

- `backend/` — основное приложение Django REST Framework.
- `backend/tests/` — тесты для приложения Django
- `frontend/` — фронт приложения на React.
- `users/` — приложение для работы с пользователями.
- `teamflow/` — приложение для работы с командами, задачами, встречами.
- `api/` — реализация API на основе Django REST Framework.

## API Endpoints (Схема)

Базовый URL: `/api/`
```
/api/
├── users/
│ ├── GET /users/ — Список пользователей
│ ├── POST /users/ — Регистрация нового пользователя
│ ├── GET /users/me/ — Данные текущего пользователя
│ ├── POST /users/set_password/ — Смена пароля
│ └── GET /users/team-users/ — Пользователи текущей команды
│
├── teams/
│ ├── GET /teams/ — Список команд текущего пользователя
│ ├── POST /teams/ — Создание новой команды
│ ├── GET /teams/{id}/ — Детали конкретной команды
│ ├── PUT /teams/{id}/change-role/ — Изменение роли участника
│ ├── PUT /teams/{id}/add-participant/ — Добавление участника
│ ├── DELETE /teams/{id}/remove-participant/ — Удаление участника
│ └── GET /teams/{id}/my-role/ — Роль текущего пользователя
│
├── tasks/
│ ├── GET /tasks/ — Список задач пользователя
│ ├── POST /tasks/ — Создание новой задачи
│ ├── GET /tasks/{id}/ — Детали задачи
│ ├── PUT/PATCH /tasks/{id}/ — Обновление задачи
│ ├── PUT /tasks/{id}/update_status/ — Обновление статуса задачи
│ ├── POST /tasks/{id}/evaluate/ — Оценка задачи
│ └── GET /tasks/executor-evaluations/ — Оценки задач, где пользователь исполнитель
│
├── tasks/{task_id}/comments/
│ ├── GET / — Список комментариев к задаче
│ ├── POST / — Добавление комментария
│ ├── GET /{id}/ — Получение конкретного комментария
│
└── meetings/
├── GET /meetings/ — Список встреч пользователя
├── POST /meetings/?team={id} — Создание встречи для команды
├── GET /meetings/{id}/ — Детали встречи
├── PUT/PATCH /meetings/{id}/ — Обновление встречи
└── DELETE /meetings/{id}/ — Удаление встречи
```


## Развёртывание на сервер

Выполните следующие команды:
```bash
docker compose up --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py collectstatic
docker compose exec backend cp -r /app/collected_static/. /backend_static/static/
```
Для создания суперпользователя выполните следующую команду:
```bash
    docker compose exec backend python manage.py createsuperuser
```

После успешного выполнения этих команд приложение будет доступно по адресу <http://localhost:8000/>.

## Настройки окружения

Перед запуском приложения настройте переменные окружения (пример в файле .env_example):

- `POSTGRES_USER`— пользователь базы данных.
- `POSTGRES_PASSWORD`— пароль пользователя базы данных.
- `POSTGRES_DB`— имя базы данных PostgreSQL.
- `SECRET_KEY` — секретный ключ Django.
- `DB_HOST` — хост базы данных.
- `DB_PORT` — порт для подключения к базе данных.
- `ALLOWED_HOSTS` — список доступных хостов.
- `DEBUG` — статус отладки Django.

## Запуск тестов

Для запуска тестов перейдите в папку

```bash
cd backend
```
И введите команду

```bash
pytest
```