# YouGame V3 Changelog

Дата: 2026-07-12

## Закрыто в текущем проходе

- Home:
  - исправлена кнопка быстрых действий «Миссии»: теперь ведёт в миссии, а не в рейтинг;
  - уменьшено дублирование главных CTA на Home.
- Shop V3:
  - добавлены вкладки `Premium`, `Картинки`, `Голос`, `Ветки`, `Артефакты`;
  - добавлена компактная строка балансов: Premium, картинки, голос, ветки;
  - после подтверждённой оплаты экран магазина обновляет данные через `onPaid`.
- Inventory / Items:
  - добавлена защита предметов от случайного расходования;
  - защищённые предметы не расходуются backend-ом;
  - управление защитой доступно в Inventory и в item bottom sheet в Game;
  - в Inventory добавлен блок «Связи» для NPC текущей истории.
- Story mechanics:
  - улики теперь формируются из Story Bible/open threads/мотива истории, а не только из фиксированных шаблонов;
  - состояние истории хранит `npc_relations`, а механика хода обновляет доверие/страх/уважение NPC.
- Payments:
  - продукты магазина получили категорию для вкладок, не меняя текущий Stars-flow.

## Уже было реализовано до текущего прохода

- Production domain/frontend:
  - Vite `base: "/"`;
  - production API `https://api.yourrulesgame.ru/api`;
  - удалён `trycloudflare` fallback из production frontend;
  - `CNAME` для `yourrulesgame.ru`;
  - crash screen, web landing, bootstrap timeout.
- Backend stability:
  - `/api/health`, `/api/ready`, `/api/version`;
  - request id header;
  - CORS для `yourrulesgame.ru`;
  - payment idempotency для Mini App payments.
- UX:
  - 5 пунктов bottom nav;
  - компактный HUD в игре;
  - сворачиваемые последствия прошлого хода;
  - подтверждение выбранного хода;
  - item bottom sheet;
  - immersive reading mode;
  - переменное количество choices и custom choice не в каждой главе.
- Story Engine:
  - `story_bible_service.py`;
  - структурированная Story Bible V3;
  - `story_memory`;
  - локальный `action_evaluator_service.py`;
  - ранний финал и плановый финал без новых вариантов выбора.

## Не закрыто полностью и требует отдельных спринтов

- PostgreSQL/Alembic migration.
- Redis, queue, restartable background jobs.
- Object storage/CDN for images/audio. Сейчас media ещё хранится через URL/data payload в текущем storage flow.
- Full i18next migration: RU/EN locales без строк в TSX.
- Web guest/web account/accounts linking.
- Share-card image generator and same-seed challenge.
- Weekly challenge, seasonal cosmetic rewards, advanced leaderboard V2.
- Full JSON writer response pipeline with validation/continuity checker on selected chapters.
- Sentry/funnel dashboards/k6 load tests.

## Проверки

- `npm run build`
- `python3 -m compileall backend/app /root/my_game/Your_rules.py`

