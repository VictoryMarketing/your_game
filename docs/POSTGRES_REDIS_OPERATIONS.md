# YouGame: PostgreSQL, Redis и worker-процессы

Дата ввода в production: 2026-07-21.

## Где находится конфигурация

- Секреты и AI-ключи: `/root/my_game/data/secret.env`.
- PostgreSQL/Redis и размеры пулов: `/root/my_game/data/infrastructure.env`.
- API: `yougame-api.service` (2 процесса).
- Telegram-бот: `yougame.service`.
- Очереди: `yougame-story-worker.service`, `yougame-media-worker.service`,
  `yougame-aux-worker.service`.

После изменения ключей перезапускается story-worker. После изменения
`infrastructure.env` перезапускаются API, бот и все worker-сервисы.

## Штатная проверка

```bash
curl -fsS https://api.yourrulesgame.ru/api/health
curl -fsS https://api.yourrulesgame.ru/api/ready
systemctl is-active postgresql redis-server yougame-api yougame \
  yougame-story-worker yougame-media-worker yougame-aux-worker
```

`/api/ready` должен вернуть `database`, `redis`, `worker_heartbeats` и
`job_workers: true`, режим `standalone`, `alive: 16`.

## Резервные копии и восстановление

Таймер ежедневно создаёт custom-format dump и проверяет его через
`pg_restore --list`:

```bash
systemctl list-timers yougame-postgres-backup.timer
ls -lh /root/backups/yougame-postgres/
```

Восстановление выполнять только в остановленное приложение и сначала в новую
тестовую БД. Пример проверки dump:

```bash
createdb yougame_restore_test
pg_restore --dbname=yougame_restore_test --clean --if-exists \
  /root/backups/yougame-postgres/yougame-YYYYMMDDTHHMMSSZ.dump
psql -d yougame_restore_test -c 'select count(*) from profiles'
dropdb yougame_restore_test
```

## Аварийный откат к SQLite

Исходный cutover-снимок:
`/root/backups/yougame-postgres-cutover-1Q5siR/game.db`.

Откат теряет изменения, записанные в PostgreSQL после cutover, поэтому он
допустим только как аварийная мера. Сначала остановить API, бот и worker'ы,
сохранить свежий PostgreSQL dump, затем отключить drop-in файлы
`40-postgres-workers.conf` и `40-postgres.conf`, вернуть снимок отдельной копией
на `/root/my_game/data/game.db`, выполнить `systemctl daemon-reload` и запустить
старые API/бот. Никогда не перезаписывать единственный cutover-снимок.

## Масштабирование

PostgreSQL — долговременная очередь и источник истины. Redis хранит только
сигналы, общие rate limits и краткоживущие heartbeat, поэтому после его рестарта
задания остаются в PostgreSQL и будут подобраны polling-механизмом.

На текущих 2 vCPU/2 ГБ не увеличивать процессы без замера памяти. После перехода
на 4 vCPU/8 ГБ можно отдельно поднять число API-процессов и story-worker slots;
сначала требуется проверить реальные RPM/TPM Kimi и OpenAI.
