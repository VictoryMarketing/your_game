# Production finalization: 2026-07-13

## Implemented

- Standalone web play now requires an email account; anonymous web guest sessions are disabled in production.
- New web accounts require email verification before login or API access.
- Verification resend and forgotten-password reset flows are available.
- SMTP supports implicit SSL on port 465 for Beget.
- Web checkout supports YooKassa SBP/QR and Crypto Pay after provider credentials are configured.
- External payment fulfillment checks provider, external payment ID, amount, currency and product, and is idempotent.
- Telegram checkout remains on Telegram Stars for digital products.
- Weekly challenge/stale story jobs are rejected before entering the generation queue; the client opens the actual active story.
- The Shop prefetches and caches all 12 products, renders a loading skeleton and exposes retry instead of an empty category.
- Three artifact products are present in the artifact tab.
- Image and voice jobs reject missing credits before a loading overlay starts.
- Generated media credits and Premium allowance are refunded on any provider/storage failure.
- Repeated requests for media already attached to a chapter do not charge again.
- A chapter without a new illustration uses a neutral placeholder instead of a previous scene-like image.

## Live backend verification

- `GET /api/health`: 200.
- `GET /api/ready`: 200.
- Shop: 12 products; 3 artifact products.
- No-credit image and voice preflight: immediate 402; no job row created.
- Archived story chapter request: immediate 409 with the current active session ID; no job row created.
- Web guest creation in production: 403.
- Web registration without SMTP: 503 before account creation.
- External payment idempotency test: two success callbacks produce one grant event and one subscription extension.
- Frontend build and Python `compileall`: passed.
- Mobile widths 320, 390 and 430 px: no horizontal overflow; artifact tab displays all three products.

Database backup created before restart:

```text
/root/my_game/data/game.db.backup_2026-07-13_11-55-09
```

## Owner configuration still required

The backend intentionally reports both external methods as unavailable until real provider secrets exist.

1. Create `noreply@yourrulesgame.ru` in Beget and add its mailbox password to `/root/my_game/data/secret.env` using the SMTP block in `docs/WEB_PAYMENTS_AND_AUTH.md`.
2. In YooKassa choose "On my website", finish verification, enable SBP, then add the live `shopId` and secret API key.
3. Create a Crypto Pay application in `@CryptoBot`, add its API token and a random webhook path secret.
4. Restart `yougame-api.service` and run the checks below.

```bash
sudo systemctl restart yougame-api.service
curl -fsS https://api.yourrulesgame.ru/api/ready
curl -fsS https://api.yourrulesgame.ru/api/payments/web/methods
journalctl -u yougame-api.service -n 100 --no-pager
```

Both payment methods must return `"available": true` before announcing web checkout.

## Frontend deployment

The backend changes are already running. The frontend changes require a commit and push:

```bash
cd /root/your_game
git add docs/WEB_PAYMENTS_AND_AUTH.md docs/PRODUCTION_FINALIZATION_2026-07-13.md src
git commit -m "Finalize web auth, shop and media preflight"
git push origin main
```

Confirm the GitHub repository secret is exactly:

```text
VITE_API_BASE_URL=https://api.yourrulesgame.ru/api
```
