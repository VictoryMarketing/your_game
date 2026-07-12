# YouGame V3 Changelog

Дата: 2026-07-12

## Закрыто в текущем проходе

- Feature flags:
  - добавлен backend endpoint `/api/feature-flags`;
  - добавлены flags `story_engine_v3`, `new_game_ui_v3`, `artifact_evolution`, `weekly_challenge`, `share_cards`, `web_auth`, `en_locale`, `async_media_jobs`;
  - frontend bootstrap загружает flags вместе с Home.
- Локализация:
  - подключены `i18next` и `react-i18next`;
  - добавлены `src/locales/ru/common.json` и `src/locales/en/common.json`;
  - локализованы bottom nav, splash/loading и вкладки магазина;
  - язык интерфейса синхронизируется с `profile.interface_language`.
- Persistent jobs:
  - добавлена таблица `generation_jobs`;
  - добавлены endpoints `/api/jobs/chapter`, `/api/jobs/image`, `/api/jobs/voice`, `/api/jobs/{job_id}`;
  - добавлен FastAPI worker loop с восстановлением `running` jobs в `queued` после рестарта;
  - текущие прямые endpoints генерации оставлены совместимыми.
- Support/refund records:
  - добавлена таблица `support_records`;
  - добавлены endpoints `/api/support/records` для создания и просмотра обращений.
- Web guest:
  - добавлена backend-таблица `web_guest_sessions`;
  - добавлен endpoint `/api/auth/web-guest`, который создаёт гостевой профиль и secure cookie;
  - frontend landing получил кнопку «Попробовать в браузере»;
  - API-клиент отправляет `credentials: include`, чтобы web guest cookie работала между `yourrulesgame.ru` и `api.yourrulesgame.ru`.
- Share cards:
  - добавлен backend endpoint `/api/share/card`;
  - карточка результата сохраняется как SVG-файл в `/api/media/shares/...`, без base64 в БД;
  - Final screen умеет создать, показать и открыть карточку финала.
- Retention:
  - добавлены weekly-миссии поверх существующей таблицы `user_mission_progress`;
  - weekly-миссии двигаются событиями `chapter_generated`, `game_finished_*`, `share_card_created`;
  - в Missions UI добавлен бейдж `Недельная`.
- Home:
  - исправлена кнопка быстрых действий «Миссии»: теперь ведёт в миссии, а не в рейтинг;
  - уменьшено дублирование главных CTA на Home.
- Shop V3:
  - добавлены вкладки `Premium`, `Картинки`, `Голос`, `Ветки`, `Артефакты`;
  - добавлена компактная строка балансов: Premium, картинки, голос, ветки;
  - после подтверждённой оплаты экран магазина обновляет данные через `onPaid`.
  - вкладки магазина адаптированы под узкие экраны без горизонтального скролла;
  - вкладка предметов переименована в `Предметы`, чтобы игроки находили товары инвентаря.
- Inventory / Items:
  - добавлена защита предметов от случайного расходования;
  - защищённые предметы не расходуются backend-ом;
  - управление защитой доступно в Inventory и в item bottom sheet в Game;
  - в Inventory добавлен блок «Связи» для NPC текущей истории.
- Story mechanics:
  - улики теперь формируются из Story Bible/open threads/мотива истории, а не только из фиксированных шаблонов;
  - состояние истории хранит `npc_relations`, а механика хода обновляет доверие/страх/уважение NPC;
  - добавлен continuity layer: последние факты, незакрытые линии, payoff-окна, необратимые последствия и отношения NPC подмешиваются в prompt каждой главы.
- Payments:
  - продукты магазина получили категорию для вкладок, не меняя текущий Stars-flow.
- Media:
  - новые картинки и озвучка сохраняются файлами в `/root/my_game/data/media`;
  - в `game_chapters.image_url` / `voice_url` для новых генераций пишется URL `/api/media/...`, а не `data:` base64;
  - старые главы с `data:` URL остаются совместимыми.

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
- Redis и внешняя очередь. Встроенный persistent worker уже добавлен как промежуточный шаг, но распределённая очередь ещё не внедрена.
- Object storage/CDN for images/audio. Локальное файловое хранилище уже включено как промежуточный шаг, но S3/CDN ещё не внедрены.
- Full i18next migration: i18n foundation готов, но ещё не все строки TSX вынесены в locale-файлы.
- Web account/accounts linking. Web guest foundation уже добавлен, но email/Google/Apple аккаунты и linking ещё не внедрены.
- Same-seed challenge.
- Weekly challenge, seasonal cosmetic rewards, advanced leaderboard V2.
- Full JSON writer response pipeline with schema validation. Continuity layer добавлен, но не как отдельный LLM-validator.
- Sentry/funnel dashboards/k6 load tests.

## Проверки

- `npm run build`
- `python3 -m compileall backend/app /root/my_game/Your_rules.py`
