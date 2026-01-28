# Quality Monitoring System - Project Estimate

## Executive Summary

Документ содержит оценку времени и ресурсов, необходимых для разработки системы Quality Monitoring с нуля силами аутсорсинговой компании.

### Краткая сводка

| Метрика | Значение |
|---------|----------|
| **Общий объём кода** | ~8,600 строк TypeScript |
| **Количество API эндпоинтов** | 35+ |
| **Таблиц в БД** | 7 |
| **Оценка трудозатрат** | 480-640 человеко-часов |
| **Срок разработки** | 8-12 недель |
| **Размер команды** | 3-4 специалиста |

---

## 1. Состав проекта

### Backend (Node.js + Fastify + TypeScript)

| Компонент | Строк кода | Описание |
|-----------|------------|----------|
| Routes (8 файлов) | ~2,200 | API эндпоинты |
| Services (7 файлов) | ~1,800 | Бизнес-логика |
| Config (4 файла) | ~270 | Конфигурация |
| Middleware (2 файла) | ~110 | Auth, Roles |
| Types (2 файла) | ~110 | TypeScript интерфейсы |
| **Итого Backend** | **~4,000** | |

### Frontend (React + TypeScript + Vite)

| Компонент | Строк кода | Описание |
|-----------|------------|----------|
| Dashboard | ~1,200 | Главная страница с графиками |
| Issues pages | ~550 | Таблицы и фильтры |
| Admin pages | ~650 | Админ-панель |
| Team page | ~200 | Структура команды |
| Auth | ~75 | Логин |
| UI Components | ~500 | shadcn/ui компоненты |
| Layout | ~125 | Header, Sidebar |
| Lib/Hooks | ~320 | API клиент, утилиты |
| **Итого Frontend** | **~4,600** | |

### Infrastructure

| Компонент | Описание |
|-----------|----------|
| Docker Compose | 3 сервиса (backend, frontend, postgres) |
| Dockerfiles | 2 multi-stage builds |
| Database Schema | 7 таблиц, 15+ индексов |
| Documentation | 6 markdown файлов |

---

## 2. Функциональные модули

### 2.1 Authentication & Authorization
- JWT токены (access + refresh)
- 3 роли: Admin, Team Lead, CC
- Role-based data filtering
- Password hashing (bcrypt)

**Сложность:** Средняя
**Оценка:** 24-32 часа

### 2.2 Google Sheets Integration
- Google Sheets API v4
- Service Account authentication
- 7 различных источников данных
- Нормализация колонок (разные форматы в разных sheets)
- Row hash deduplication
- Cron-синхронизация каждые 10 минут

**Сложность:** Высокая
**Оценка:** 40-56 часов

### 2.3 Analytics Dashboard
- 8 KPI карточек с трендами
- Area chart (30-day trends)
- Team Performance с drill-down
- Period selector (Week/Month/Quarter)
- Auto-generated insights
- Month-over-Month comparison

**Сложность:** Высокая
**Оценка:** 48-64 часа

### 2.4 Returns Analytics
- Returns overview cards
- CC Fault distribution by reason
- By Team Lead breakdown
- By CC detailed table
- Period-based filtering
- Date parsing (US format)

**Сложность:** Средняя
**Оценка:** 32-40 часов

### 2.5 Issues Management
- Paginated data table
- Multi-filter system (date, source, team, CC, severity)
- CSV export
- My Issues (personal view)

**Сложность:** Средняя
**Оценка:** 24-32 часа

### 2.6 Email Reports System
- HTML email templates
- Daily automated reports (cron)
- Weekend logic (Fri+Sat+Sun on Monday)
- Operations + Team Lead reports
- SMTP integration (Gmail)
- Email logs tracking

**Сложность:** Высокая
**Оценка:** 40-48 часов

### 2.7 User Management
- CRUD для пользователей
- Team structure sync
- CC abbreviation mapping
- Active/Inactive status

**Сложность:** Низкая
**Оценка:** 16-24 часа

### 2.8 Admin Panel
- User management UI
- Sync status monitoring
- Sync logs viewer
- Sources configuration
- Email logs viewer

**Сложность:** Средняя
**Оценка:** 24-32 часа

### 2.9 UI/UX Design & Components
- shadcn/ui integration
- TailwindCSS styling
- Responsive layout
- Dark gradients, cards
- Interactive elements
- Loading states

**Сложность:** Средняя
**Оценка:** 32-40 часов

### 2.10 DevOps & Deployment
- Docker multi-stage builds
- Docker Compose orchestration
- Environment configuration
- VPS deployment
- Database migrations

**Сложность:** Средняя
**Оценка:** 16-24 часа

---

## 3. Необходимые специалисты

### 3.1 Backend Developer (Senior/Middle+)

**Требования:**
- Node.js, TypeScript (обязательно)
- Fastify или Express
- PostgreSQL, SQL
- REST API design
- Google APIs integration
- Cron jobs, background tasks

**Задачи:**
- Архитектура backend
- API endpoints (35+)
- Google Sheets sync logic
- Email report generation
- Database schema design
- Authentication system

**Оценка времени:** 160-200 часов

### 3.2 Frontend Developer (Senior/Middle+)

**Требования:**
- React 18+, TypeScript (обязательно)
- TailwindCSS
- React Query (TanStack Query)
- Recharts или аналог
- shadcn/ui или аналог
- Responsive design

**Задачи:**
- Dashboard с графиками
- Data tables с фильтрами
- Admin panel
- UI компоненты
- API интеграция
- State management

**Оценка времени:** 160-200 часов

### 3.3 DevOps Engineer (Middle)

**Требования:**
- Docker, Docker Compose
- Linux server administration
- Nginx (опционально)
- SSL/TLS setup
- Basic monitoring

**Задачи:**
- Dockerfiles
- Docker Compose setup
- VPS deployment
- Environment management
- CI/CD (если требуется)

**Оценка времени:** 24-40 часов

### 3.4 QA Engineer (Middle) - опционально

**Требования:**
- Manual testing
- API testing (Postman)
- Basic automation (опционально)

**Задачи:**
- Functional testing
- Integration testing
- Regression testing
- Bug reports

**Оценка времени:** 40-60 часов

### 3.5 Project Manager / Tech Lead (частичная загрузка)

**Задачи:**
- Requirements gathering
- Sprint planning
- Code review
- Architecture decisions
- Client communication

**Оценка времени:** 40-60 часов

---

## 4. Детальная разбивка по фазам

### Фаза 1: Setup & Foundation (Неделя 1-2)

| Задача | Специалист | Часы |
|--------|------------|------|
| Project setup, boilerplate | Backend | 8 |
| Database schema design | Backend | 8 |
| React + Vite setup | Frontend | 8 |
| Docker configuration | DevOps | 8 |
| Auth system (JWT) | Backend | 16 |
| Login page | Frontend | 8 |
| Layout (Header, Sidebar) | Frontend | 8 |
| **Итого Фаза 1** | | **64** |

### Фаза 2: Core Features (Неделя 3-5)

| Задача | Специалист | Часы |
|--------|------------|------|
| Google Sheets integration | Backend | 24 |
| Issues sync service | Backend | 16 |
| Issues API endpoints | Backend | 8 |
| Issues table + filters | Frontend | 24 |
| Dashboard KPI cards | Frontend | 16 |
| Dashboard trend chart | Frontend | 8 |
| User management API | Backend | 8 |
| User management UI | Frontend | 16 |
| Role-based filtering | Backend | 8 |
| **Итого Фаза 2** | | **128** |

### Фаза 3: Advanced Analytics (Неделя 6-8)

| Задача | Специалист | Часы |
|--------|------------|------|
| Team analytics API | Backend | 16 |
| CC analytics API | Backend | 16 |
| Team Performance section | Frontend | 24 |
| Drill-down functionality | Frontend | 16 |
| Period selector | Frontend | 8 |
| Month-over-month comparison | Backend + Frontend | 16 |
| Auto-generated insights | Backend | 8 |
| My Issues page | Frontend | 8 |
| **Итого Фаза 3** | | **112** |

### Фаза 4: Returns & Reports (Неделя 9-10)

| Задача | Специалист | Часы |
|--------|------------|------|
| Returns sync service | Backend | 16 |
| Returns API endpoints | Backend | 16 |
| Returns analytics UI | Frontend | 24 |
| Email report service | Backend | 24 |
| Email templates | Backend | 8 |
| Cron job setup | Backend | 4 |
| Weekend logic | Backend | 4 |
| Email logs | Backend + Frontend | 8 |
| **Итого Фаза 4** | | **104** |

### Фаза 5: Polish & Deploy (Неделя 11-12)

| Задача | Специалист | Часы |
|--------|------------|------|
| Admin panel polish | Frontend | 16 |
| Sync status page | Frontend | 8 |
| Team structure page | Frontend + Backend | 16 |
| Bug fixes | All | 24 |
| Production deployment | DevOps | 16 |
| Documentation | All | 16 |
| Testing | QA | 40 |
| **Итого Фаза 5** | | **136** |

---

## 5. Итоговая оценка

### По специалистам

| Специалист | Часы (min) | Часы (max) | Ставка (USD/час)* | Стоимость (USD) |
|------------|------------|------------|-------------------|-----------------|
| Backend Developer | 160 | 200 | $40-60 | $6,400 - $12,000 |
| Frontend Developer | 160 | 200 | $40-60 | $6,400 - $12,000 |
| DevOps Engineer | 24 | 40 | $35-50 | $840 - $2,000 |
| QA Engineer | 40 | 60 | $25-40 | $1,000 - $2,400 |
| Project Manager | 40 | 60 | $35-50 | $1,400 - $3,000 |
| **ИТОГО** | **424** | **560** | | **$16,040 - $31,400** |

*Ставки указаны для Eastern Europe (Ukraine, Poland, etc.)

### По срокам

| Вариант | Команда | Срок | Часы | Стоимость |
|---------|---------|------|------|-----------|
| **Минимальный** | 2 разработчика (Full-stack) | 10-12 недель | ~480 | $16,000-20,000 |
| **Оптимальный** | 3 специалиста (BE + FE + DevOps/QA) | 8-10 недель | ~520 | $20,000-25,000 |
| **Расширенный** | 4 специалиста + PM | 6-8 недель | ~600 | $25,000-32,000 |

---

## 6. Риски и допущения

### Допущения
- Требования чётко определены заранее
- Google Sheets структура известна
- Дизайн не требует отдельного UI/UX специалиста
- Нет необходимости в мобильной версии
- Один production environment

### Риски

| Риск | Влияние | Митигация |
|------|---------|-----------|
| Изменение требований | +20-40% времени | Agile-подход, MVP первым |
| Нестабильная структура Google Sheets | +10-20% времени | Гибкий парсер, логирование |
| Интеграционные проблемы | +10-15% времени | Early integration testing |
| Недооценка UI сложности | +15-25% времени | UI-first подход |

### Буфер
Рекомендуется добавить **20-30% буфер** к итоговой оценке для непредвиденных ситуаций.

---

## 7. Сравнение с AI-assisted разработкой

### Традиционная разработка
- **Команда:** 3-4 человека
- **Срок:** 8-12 недель
- **Стоимость:** $16,000 - $32,000
- **Всего человеко-часов:** 480-640

### AI-Assisted разработка (Claude Code)
- **Команда:** 1 человек + AI
- **Срок:** 2-3 недели
- **Стоимость:** ~$200-500 (API costs) + время специалиста
- **Эффективность:** x4-x6 быстрее

### Выводы
AI-инструменты позволяют сократить время разработки в 4-6 раз при сохранении качества кода. Однако требуется квалифицированный специалист для:
- Постановки задач
- Ревью кода
- Принятия архитектурных решений
- Тестирования и отладки

---

## 8. Рекомендации

### Для заказчика
1. **MVP-подход**: Начать с базового функционала (Issues + Dashboard), затем добавлять Returns и Reports
2. **Чёткое ТЗ**: Подготовить детальные требования с примерами Google Sheets
3. **Итеративная разработка**: Еженедельные демо и фидбек
4. **Тестовые данные**: Предоставить реальные примеры данных для тестирования

### Для исполнителя
1. **TypeScript строго**: Избегать `any`, полная типизация
2. **Модульная архитектура**: Отдельные сервисы для каждого источника данных
3. **Логирование**: Детальные логи для sync операций
4. **Graceful degradation**: Система должна работать при недоступности Google Sheets

---

## Приложение A: Технологический стек

### Backend
```
Node.js 20 LTS
Fastify 4.x
TypeScript 5.x
PostgreSQL 15
googleapis (Google Sheets API)
node-cron
nodemailer
bcrypt
jsonwebtoken
```

### Frontend
```
React 18
TypeScript 5.x
Vite 5.x
TailwindCSS 3.x
shadcn/ui
@tanstack/react-query
recharts
lucide-react
axios
```

### DevOps
```
Docker 24+
Docker Compose 2.x
nginx:alpine (frontend serving)
node:20-alpine (backend)
postgres:15-alpine
```

---

## Приложение B: Аналоги и стоимость

### SaaS альтернативы
| Продукт | Стоимость/мес | Ограничения |
|---------|---------------|-------------|
| Metabase + Custom | $85-500 | Нет email reports, нет ролей |
| Tableau | $70-840/user | Сложная настройка sync |
| Google Data Studio | Free | Нет auth, нет email |
| Custom SaaS | $500-2000 | Lock-in, нет кастомизации |

### Вывод
Custom разработка оправдана при:
- Специфичных бизнес-требованиях
- Необходимости полного контроля
- Планах на долгосрочное развитие
- Интеграции с внутренними системами

---

*Документ подготовлен: Январь 2026*
*Версия: 1.0*
