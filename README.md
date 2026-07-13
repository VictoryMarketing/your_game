# YouGame Telegram Mini App

Frontend for `https://yourrulesgame.ru/`.

## Local

```bash
npm install
VITE_API_BASE_URL=http://127.0.0.1:8088/api npm run dev
```

The same build supports two authenticated environments:

- Telegram Mini App through signed `window.Telegram.WebApp.initData`;
- standalone web through a verified email account and secure session cookie.

## GitHub Pages

Repository settings:

- Pages source: GitHub Actions
- Custom domain: `yourrulesgame.ru`
- Secret: `VITE_API_BASE_URL=https://api.yourrulesgame.ru/api`

Do not add OpenAI, Telegram bot token, database credentials, or admin IDs to frontend secrets.

## Build

```bash
npm run build
```

Vite is configured with `base: "/"` for the production custom domain.

Production setup and the latest verification report:

- [`docs/WEB_PAYMENTS_AND_AUTH.md`](docs/WEB_PAYMENTS_AND_AUTH.md)
- [`docs/PRODUCTION_FINALIZATION_2026-07-13.md`](docs/PRODUCTION_FINALIZATION_2026-07-13.md)
