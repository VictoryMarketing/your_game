# Готовность YouGame к 100 одновременным игрокам

Дата проверки: 2026-07-21.

## Что подготовлено

- Текстовые jobs отделены от иллюстраций, озвучки и email. Долгая картинка больше
  не может занять worker следующей главы.
- Настроено 12 text-worker'ов, 3 media-worker'а и 1 вспомогательный worker.
- Три text-worker'а зарезервированы для Kimi-only историй. Когда взрослых
  историй нет, они помогают общей очереди.
- Kimi ограничен отдельным семафором. Обычные истории при локальной перегрузке,
  `429`, timeout, сетевой ошибке или исчерпании Kimi-квоты переходят на OpenAI,
  сохраняя общий deadline запроса.
- Эротические/сексуальные/`adult_relationship` истории помечаются при постановке
  в очередь и при выполнении; OpenAI fallback для них запрещён.
- Очередь ограничена 500 ожидающими jobs, повторная отправка идемпотентна,
  прерванные jobs восстанавливаются после рестарта, завершённые удаляются через
  7 дней.
- Polling клиента замедлен примерно до одного запроса в 2.2–3.2 секунды с
  jitter, в фоне — до 5 секунд. Ожидание текста увеличено до 15 минут.
- Основная база перенесена с SQLite на PostgreSQL 16. Захват jobs использует
  `FOR UPDATE SKIP LOCKED`, поэтому несколько процессов не забирают одну работу.
- Redis используется для мгновенного пробуждения очередей, общих rate limits и
  heartbeat-проверки процессов; PostgreSQL остаётся источником истины, поэтому
  краткий отказ Redis не теряет jobs.
- API запущен в двух uvicorn-процессах. Генерация вынесена в три systemd-сервиса:
  story, media и aux; Telegram-бот использует ту же PostgreSQL-базу.
- Admin API `/api/admin/jobs/capacity` показывает живые worker'ы, глубину и
  возраст очереди без раскрытия ключей.

## Текущая безопасная конфигурация

В `/root/my_game/data/secret.env`:

```env
KIMI_MAX_CONCURRENT_REQUESTS=3
OPENAI_MAX_CONCURRENT_REQUESTS=8
JOB_STORY_WORKER_COUNT=12
JOB_KIMI_STORY_WORKER_COUNT=3
JOB_MEDIA_WORKER_COUNT=3
JOB_AUX_WORKER_COUNT=1
JOB_MAX_QUEUED=500
KIMI_OPENAI_FALLBACK_ENABLED=1
KIMI_QUEUE_WAIT_SECONDS=1.5
KIMI_ADULT_QUEUE_WAIT_SECONDS=85
KIMI_FALLBACK_RESERVE_SECONDS=14
```

Это рассчитано на 100 одновременно подключённых игроков и burst до 100 jobs.
Скорость завершения всех 100 генераций определяется RPM/TPM внешних провайдеров.
Локальная очередь не может превратить лимит в мгновенную пропускную способность.

## Дополнительные Kimi-ключи

Добавлять только в серверный `/root/my_game/data/secret.env`, никогда не во
frontend или GitHub Pages:

```env
MOONSHOT_API_KEY=основной_ключ
MOONSHOT_API_KEY_2=ключ_независимого_проекта_2
MOONSHOT_API_KEY_3=ключ_независимого_проекта_3
```

Несколько ключей одного проекта обычно делят общую квоту. Для них оставьте
`KIMI_MAX_CONCURRENT_REQUESTS=3`. После подтверждённого повышения квоты можно,
например, поднять Kimi concurrency до 6 и зарезервировать 6 worker'ов, сохраняя
не менее 8 general-worker'ов:

```env
KIMI_MAX_CONCURRENT_REQUESTS=6
JOB_STORY_WORKER_COUNT=14
JOB_KIMI_STORY_WORKER_COUNT=6
```

После изменения: `systemctl restart yougame-api.service`, затем проверить
`/api/ready`, `/api/admin/llm/provider` и `/api/admin/jobs/capacity`.

Ключи подхватываются при старте story-worker, поэтому после изменения Kimi/OpenAI
ключей перезапускайте прежде всего:

```bash
systemctl restart yougame-story-worker.service
curl -fsS https://api.yourrulesgame.ru/api/ready
```

## Текущая production-архитектура

```text
Cloudflare -> uvicorn x2 -> PostgreSQL 16
                         -> Redis
Telegram bot -----------> PostgreSQL 16
Redis signals -> story-worker (12 async slots, 3 Kimi-reserved)
              -> media-worker (3 slots)
              -> aux-worker (1 slot + subscriptions)
```

Параметры инфраструктуры лежат в серверном
`/root/my_game/data/infrastructure.env`. На машине с 2 vCPU/2 ГБ RAM пул ограничен
четырьмя соединениями на процесс. Увеличивать `DB_POOL_MAX_SIZE`, число uvicorn
процессов или worker'ов без проверки памяти не следует.

100 параллельных readiness-запросов после миграции дали 100 ответов HTTP 200.
Это подтверждает работу локального контура и БД, но реальная скорость 100
одновременных историй всё ещё ограничена RPM/TPM и бюджетом Kimi/OpenAI. Для
постоянной, а не кратковременной нагрузки в 100 активных генераций рекомендуется
4 vCPU/8 ГБ RAM и подтверждённые квоты провайдеров.

## Сервисы и диагностика

```bash
systemctl status yougame-api yougame \
  yougame-story-worker yougame-media-worker yougame-aux-worker
curl -fsS https://api.yourrulesgame.ru/api/ready
redis-cli ping
psql -d yougame -c 'select status,job_type,count(*) from generation_jobs group by 1,2'
```

Ежедневный проверяемый PostgreSQL dump создаётся в
`/root/backups/yougame-postgres/`, хранение — 14 дней. Таймер:

```bash
systemctl status yougame-postgres-backup.timer
systemctl start yougame-postgres-backup.service
```

Cutover-снимок исходной SQLite сохранён в
`/root/backups/yougame-postgres-cutover-1Q5siR/game.db`. SQLite больше не является
рабочей базой, но оставлена неизменной для аварийного отката.

## Проверки без платных AI-вызовов

```bash
cd /root/my_game
PYTHONPATH=backend .venv/bin/python backend/scripts/test_job_queue_100.py
PYTHONPATH=backend .venv/bin/python backend/scripts/test_job_pool_isolation.py
PYTHONPATH=backend .venv/bin/python backend/scripts/test_provider_failover.py
PYTHONPATH=backend .venv/bin/python backend/scripts/test_generation_job_idempotency.py
```

Платный production load test следует начинать с 10, затем 25, 50 и 100 VU,
контролируя фактические 429, latency, queue age и расходы обоих провайдеров.
