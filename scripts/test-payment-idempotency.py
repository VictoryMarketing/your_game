#!/usr/bin/env python3
"""Isolated regression test: repeated provider callback grants a product once."""

import os
import sys
import tempfile
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2] / "my_game" / "backend"
VENV_PYTHON = BACKEND_DIR.parent / ".venv" / "bin" / "python3"
if sys.prefix == sys.base_prefix and VENV_PYTHON.exists():
    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), *sys.argv])
sys.path.insert(0, str(BACKEND_DIR))


with tempfile.TemporaryDirectory(prefix="yougame-payment-test-") as tmp:
    os.environ["YOUGAME_DB_PATH"] = os.path.join(tmp, "test.db")
    os.environ["ENV"] = "development"

    from app.db import db_cursor, init_db
    from app.repositories.profiles_repo import ensure_profile, get_profile
    from app.services.web_payment_service import PROVIDER_YOOKASSA, finalize_external_payment

    init_db()
    user_id = "payment-test-user"
    ensure_profile(user_id, "Payment Test")
    payment_id = "payment-test-id"
    external_id = "provider-test-id"
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO payments(
                   id,user_id,product_code,stars_amount,status,invoice_payload,
                   provider,currency,amount_value,external_id
               ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (payment_id, user_id, "images_10", 90, "invoice_sent", "test", PROVIDER_YOOKASSA, "RUB", "149.00", external_id),
        )

    assert finalize_external_payment(payment_id, PROVIDER_YOOKASSA, external_id, "succeeded")
    after_first = int((get_profile(user_id) or {}).get("image_credits") or 0)
    assert finalize_external_payment(payment_id, PROVIDER_YOOKASSA, external_id, "succeeded")
    after_second = int((get_profile(user_id) or {}).get("image_credits") or 0)
    assert after_first == 12, after_first  # 10-product + 2 first-purchase bonus
    assert after_second == after_first, (after_first, after_second)
    print("payment-idempotency-ok", after_second)
