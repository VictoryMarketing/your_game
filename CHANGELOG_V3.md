# YouGame V3 Changelog

## 2026-07-14 — Shop promotion, interaction settings and visual polish

- Added one server-side source of truth for a real 20% promotion in RUB and Telegram Stars, including regular prices and an explicit end date.
- Payment invoices, receipts and recurring-payment consent now use the same amount shown in the shop; auto-renewal keeps the price accepted by the user.
- Redesigned product cards and purchase controls with crossed-out regular prices, savings, promotion deadline and stronger contrast.
- Added the profile option `confirm_moves`, disabled by default. Choices now start the next chapter immediately unless the player enables confirmation.
- Refined primary and secondary buttons, choice feedback, keyboard focus, typography rendering, splash loading and chapter/image/voice progress indicators.
- Added the backward-compatible SQLite migration for `profiles.confirm_moves`.

Дата: 2026-07-14

## Закрыто в текущем проходе

- Search discovery and sitemap reliability (2026-07-14):
  - `robots.txt` получил отдельную политику Yandex, canonical sitemap, очистку дублирующих GET-параметров и явный доступ для основных поисковых и AI-краулеров;
  - XML/TXT sitemap теперь генерируются из единого реестра и проверяются перед каждой production-сборкой;
  - GitHub Pages workflow после deploy отправляет изменённые публичные URL в Yandex и сеть IndexNow;
  - добавлена индексируемая FAQ-страница с видимыми ответами и совпадающей schema.org-разметкой;
  - главная получила связанный graph `Organization`, `WebSite`, `VideoGame` и `SoftwareApplication`, а AI-контекст дополнен правилами корректного цитирования;
  - SEO-проверка ловит отсутствующие и дублирующиеся metadata, canonical, H1, URL sitemap и некорректный JSON-LD до публикации.

- Reliable story transitions and richer book planning (2026-07-14):
  - обычный старт больше не наследует сохранённый seed «Тайны недели» и не возвращает игрока в старое испытание;
  - параллельные задачи старта различаются по полному набору настроек, поэтому разные новые истории не могут получить один и тот же результат;
  - управление активной веткой стало явным: продолжить, приостановить в архиве, завершить или удалить перед новой историей;
  - старая ветка меняет статус только после успешного создания первой главы новой, поэтому ошибка генерации не уничтожает прогресс;
  - экран глубокой настройки открывает необязательный собственный запрос пустым и не подмешивает служебный текст испытания;
  - общий каталог жанров расширен сказкой, прозой, современной прозой, боевиком и другими популярными направлениями;
  - архивные истории помечены как приостановленные и восстанавливаются явной кнопкой продолжения;
  - Story Bible планирует ансамбль из 4-6 различимых персонажей, повторяющиеся локации, отношения, самостоятельные цели NPC и смену эмоционального ритма.

- Viewport-safe item dialogs (2026-07-14):
  - общий `ModalPortal` переведён на нативный top layer через `dialog.showModal()` с CSS fallback для старых Telegram WebView;
  - карточки предметов из коллекции и каталога всегда центрируются относительно видимого экрана и больше не зависят от высоты страницы или позиции прокрутки;
  - исправлена grid-разметка карточки предмета; прокрутка остаётся только внутри диалога на действительно низких экранах.

- Narrative intelligence, centered dialogs and search discovery (2026-07-13):
  - splash получил контрастный центральный световой слой и новый loader поверх фона без текста;
  - SelectSheet, управление активной историей, способ оплаты, выбор предмета и карточка предмета переведены в единый viewport portal с блокировкой фоновой прокрутки;
  - карточка предмета стала компактным центрированным диалогом с редкостью, описанием, сценарием применения и защитой;
  - в игре добавлено понятное «Досье хода»: улику можно вставить в свободный ход, а отношения показывают накопленную память персонажей;
  - backend сопоставляет улики по значимым словам, сохраняет scene-specific clue candidates и обновляет отношения того персонажа, которого действительно затронул ход;
  - Story Bible получил эмоциональный конфликт, моральную ось героя, модель отношений, живые имена NPC и разнообразный ритм сцен;
  - глава получает отдельный драматический профиль, а publish-checker отклоняет однотипные стратегии выбора;
  - добавлены уникальные SEO-страницы про интерактивную книгу, текстовую RPG и персональные истории, расширенный `llms-full.txt`, полные social metadata и оформленная 404;
  - публичные страницы используют оптимизированный фон без сгенерированных надписей и связаны внутренними ссылками.

- Adaptive desktop worlds and centered rewards (2026-07-13):
  - окно выпавшего предмета перенесено в viewport portal: оно сразу появляется по центру, блокирует фоновую прокрутку и не зависит от позиции главы;
  - старый фон с ошибочной надписью заменён на три оптимизированных WebP-сцены без текста: магическая карта, архивная мастерская и сокровищница;
  - фон автоматически соответствует текущему разделу, а боковые магические линии медленно движутся без тяжёлого canvas или видео;
  - удалены повторяющиеся декоративные логотипы по краям; для `prefers-reduced-motion` движение отключается.

- Experience, inventory and growth layer (2026-07-13):
  - на Home заполнена четвёртая quick-action позиция кнопкой `Инвентарь` под `Миссиями`;
  - выпадение предмета теперь передаёт chapter-scoped payload и открывает одноразовое анимированное reveal-окно с редкостью, описанием и переходом в инвентарь;
  - ваши предметы и каталог редкостей переведены на компактные горизонтальные rails со scroll snap, колесом мыши и стрелками;
  - озвучка переведена на глобальный плеер: пауза, перемотка, громкость, скорость 0.5–2x и продолжение воспроизведения между экранами;
  - плеер показывается внутри страницы главы и в постоянном dock на остальных экранах;
  - подключены локальные кириллические Manrope/Literata и расширенное desktop-оформление с картой по краям;
  - добавлены публичные SEO-страницы, sitemap, robots, manifest, structured data и `llms.txt`;
  - добавлена закрытая панель владельца с DAU, возвратом D1/D7, воронкой, глубиной историй, выручкой, товарами, оплатами и активными игроками.

- Production media and chapter safety (2026-07-13):
  - обрезанный writer JSON больше не может попасть в публичный текст главы; добавлены повторный repair, безопасное извлечение `scene` и финальный publish-guard;
  - четыре ранее повреждённые главы и их history-контекст восстановлены из резервной копии writer response;
  - озвучка читает сцену полностью и затем все варианты, длинный текст собирается из нескольких MP3 без обрезания;
  - legacy-озвучки обновляются до полной версии без повторного списания кредита;
  - добавлены 13 бесплатных кэшированных превью голосов и отдельная вкладка `Голос` в профиле;
  - иллюстрации переведены на landscape 1536x1024 medium и получают scene-specific prompt с контролем композиции и continuity;
  - остаток глав, картинок и озвучек виден на Home, в игровом HUD и профиле;
  - внешний checkout открывается в отдельном окне и возвращается в исходную категорию магазина;
  - shimmer-заглушки экранов генерации заменены компактным анимированным loader.

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

# 2026-07-13 — Sharing, resources and voice preview polish

- Added explicit copy confirmation for referral links on Home and Missions, including a WebView-safe clipboard fallback.
- Added signed referral landing pages with personalized Open Graph text, current story title and the existing wide game artwork for Telegram/social link previews.
- Reworked the Home resource strip to clearly show chapters available now, image credits, voice credits, Premium allowances and the daily streak.
- Added play, pause, resume and immediate switching between narrator previews.
- Voice preview audio now respects the selected delivery style and speed; generated variants are cached and remain free to audition.
- Replaced the initial three-bar skeleton with the same centered magical loader used by chapter, image and voice generation.

# 2026-07-13 — Exact entitlements, support and weekly challenge state

- Unified the former "20 voices for one game" product with regular voice credits, so every purchase immediately exposes all 20 credits in Telegram and web.
- Migrated outstanding legacy voice-game packages without duplication and recorded the exact entitlement kind/units on paid rows.
- Added regression coverage for every voice/image bundle, repeated payment callbacks, Premium allowances and legacy package migration.
- Added an in-app support screen with persistent ticket history, categories and immediate Telegram notification for the administrator; entry points are available in Hero/Account and Shop.
- Weekly Mystery can now be started only once per weekly seed: the Home card resumes the original session, restores it from archive or marks it completed instead of creating a duplicate.
- Home now explains the current weekly challenge state and chapter directly on the challenge card.

# 2026-07-13 — Profile auto-media synchronization

- Saving auto-image or auto-voice in Hero/Stories now updates the active game session as well as the profile default.
- New stories initialize both media toggles from the saved profile instead of forcing them off.
- Session state, database columns and nested game settings are updated together, preventing stale toggle labels.
- Narrator voice, delivery style and speed continue to be read from the latest saved profile when each voice job starts.
