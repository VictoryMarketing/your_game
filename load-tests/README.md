# Load tests

Install k6 separately and use a dedicated web account. Start small:

```bash
TEST_EMAIL=... TEST_PASSWORD=... HOME_VUS=10 k6 run load-tests/home-and-auth.js
```

Increase to the acceptance scenarios only after PostgreSQL/Redis/external workers are deployed and metrics are visible. `jobs.js` spends media credits and therefore refuses to run unless `ALLOW_PAID_LOAD=YES` is explicitly set.

The payment idempotency regression test does not call a provider or the production database:

```bash
cd /root/my_game
PYTHONPATH=backend .venv/bin/python /root/your_game/scripts/test-payment-idempotency.py
```
