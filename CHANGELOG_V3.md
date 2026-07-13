# YouGame V3 Changelog

Дата: 2026-07-13

## Закрыто в текущем проходе

- Story writer JSON pipeline:
  - writer запрашивает строгий JSON V3 с типом сцены, нитями, изменениями NPC, media hints и метаданными choices;
  - скрытые `risk`, `cost_type`, `trait`, `target_thread` остаются на backend и не отправляются клиенту;
  - кнопочные варианты оцениваются по сохранённым метаданным без дополнительного дорогого вызова;
  - текстовый ответ модели остаётся совместимым fallback.
- Финал V3:
  - состояние сохраняет название и тип концовки, судьбу героя/мира/NPC, три ключевых решения, найденные и пропущенные тайны, архетип прохождения;
  - UI показывает эти итоги без выдуманных процентов редкости.
- Архив V3:
  - главы сохраняют снимок игрового состояния;
  - из новой архивной главы можно создать независимую fork-session за 1 жетон ветвления;
  - legacy-главы без snapshot остаются читаемыми и не создают некорректную ветку из будущего состояния.
- Web accounts:
  - добавлены регистрация, вход, подтверждение email, восстановление пароля и HttpOnly web session;
  - гость может сохранить уже начатый прогресс в email-аккаунт;
  - покупки за реальные деньги разрешены только сохранённому web account.
- Web payments:
  - добавлены YooKassa SBP и Crypto Pay для standalone web;
  - реализованы проверяемые webhook, polling и атомарная idempotent-выдача;
  - Telegram flow по-прежнему использует Stars;
  - добавлена инструкция `docs/WEB_PAYMENTS_AND_AUTH.md`.
- Production jobs:
  - GameScreen переведён на persistent jobs для главы, картинки и голоса;
  - долгие операции больше не зависят от 15-секундного HTTP request;
  - повторный тап возвращает текущую активную job вместо дубля.
- Production safety:
  - добавлен rate limit для auth, jobs и invoice endpoints;
  - request logs содержат request ID, status и duration;
  - ежедневный backup SQLite/media включён systemd timer-ом, retention 14 дней.
- UX/UI:
  - профиль разделён на `Герой`, `Истории`, `Коллекция`, `Аккаунт`;
  - checkbox автомедиа заменены switch controls;
  - immersive reading сохраняет choices и подтверждение хода;
  - loading overlay исправлен для узких Telegram WebView без `100vw`-смещения;
  - сцена делится на вводный текст, иллюстрацию и продолжение.
- Retention/social:
  - добавлено еженедельное same-seed испытание;
  - challenge deep link открывает заранее заданные настройки;
  - Story Bible получает стабильный challenge seed.

- Feature flags:
  - добавлен backend endpoint `/api/feature-flags`;
  - добавлены flags `story_engine_v3`, `new_game_ui_v3`, `artifact_evolution`, `weekly_challenge`, `share_cards`, `web_auth`, `en_locale`, `async_media_jobs`;
  - frontend bootstrap загружает flags вместе с Home.
- Локализация:
  - подключены `i18next` и `react-i18next`;
  - добавлены `src/locales/ru/common.json` и `src/locales/en/common.json`;
  - локализованы bottom nav, splash/loading и вкладки магазина;
  - язык интерфейса синхронизируется с `profile.interface_language`;
  - профильный переключатель языка теперь предлагает `Русский` / `English`;
  - Story Engine prompt учитывает `profile.interface_language` для языка названия, плана, главы и вариантов.
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
- Production ops:
  - добавлен `scripts/backup-yougame.sh` для SQLite/media backup перед миграциями;
  - добавлен `scripts/smoke-production.sh` для health/ready/version/web/CORS smoke-test;
  - создана свежая ручная копия `/root/backups/yougame-manual-20260712233310`.
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
  - в Inventory добавлен блок «Связи» для NPC текущей истории;
  - добавлен backend summary коллекций по редкостям;
  - предметы получают evolution level/label по количеству копий;
  - в Inventory добавлен блок «Коллекции».
- Story mechanics:
  - улики теперь формируются из Story Bible/open threads/мотива истории, а не только из фиксированных шаблонов;
  - состояние истории хранит `npc_relations`, а механика хода обновляет доверие/страх/уважение NPC;
  - добавлен continuity layer: последние факты, незакрытые линии, payoff-окна, необратимые последствия и отношения NPC подмешиваются в prompt каждой главы.
- Payments:
  - продукты магазина получили категорию для вкладок, не меняя текущий Stars-flow.
  - добавлены web checkout через YooKassa СБП и Crypto Pay для самостоятельной web-версии;
  - Telegram Mini App сохраняет Stars-only flow для цифровых товаров;
  - добавлены atomic entitlement grant, polling статуса и isolated regression test повторного webhook;
  - добавлены явное согласие с условиями, `/terms`, `/paysupport`, страницы `terms.html` и `privacy.html`.
- Media:
  - новые картинки и озвучка сохраняются файлами в `/root/my_game/data/media`;
  - в `game_chapters.image_url` / `voice_url` для новых генераций пишется URL `/api/media/...`, а не `data:` base64;
  - старые главы с `data:` URL остаются совместимыми;
  - выполнена миграция 14 legacy media payloads в файловое хранилище, в рабочей БД `data:` URL больше нет.
- Web account:
  - добавлены регистрация/login/logout по email, secure HttpOnly session cookie, verification/reset flow и перенос гостевого профиля;
  - платные web-покупки доступны только сохранённому web account, а не анонимному гостю.
- Quality and load checks:
  - добавлен ежедневный offline story quality report и systemd timer;
  - добавлены k6-сценарии Home/auth и guarded paid jobs;
  - milestone critic работает для первой, midpoint и финальной главы, deterministic continuity validation работает всегда.

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
- Google/Apple identity и linking Telegram с web account.
- Seasonal cosmetic rewards и расширенные вкладки leaderboard V2.
- Sentry и внешняя funnel/dashboard система. События, offline quality report и k6-шаблоны уже есть.

## Проверки

- `npm run build`
- `python3 -m compileall backend/app /root/my_game/Your_rules.py`
# 2026-07-13 — Live billing, narrator settings and web growth

- Added Premium plans for 1, 3 and 6 months with progressive discounts.
- Added web checkout consent for optional YooKassa auto-renewal; the control remains disabled until recurring payments are enabled for the live shop.
- Added narrator voice, delivery style and speed controls shared by Telegram Mini App and standalone web.
- Added verified account email and auto-renewal management to the profile.
- Added in-app purchase/referral notifications.
- Added standalone web referral links that survive email verification and reward both users after the first chapter.
- Added an explicit spam-folder hint to verification and password recovery screens.
- Kept Telegram digital-goods checkout on Telegram Stars; YooKassa remains standalone-web only.
