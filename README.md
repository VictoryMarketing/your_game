# YouGame Telegram Mini App

Frontend for `https://victorymarketing.github.io/your_game/`.

## Local

```bash
npm install
VITE_API_BASE_URL=http://127.0.0.1:8088/api npm run dev
```

Production Mini App must be opened inside Telegram so `window.Telegram.WebApp.initData` is available.

## GitHub Pages

Repository settings:

- Pages source: GitHub Actions
- Secret: `VITE_API_BASE_URL=https://<your-api-domain>/api`

Do not add OpenAI, Telegram bot token, database credentials, or admin IDs to frontend secrets.

## Build

```bash
npm run build
```

Vite is configured with `base: "/your_game/"`.
