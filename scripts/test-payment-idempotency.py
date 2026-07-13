#!/usr/bin/env python3
"""Isolated regression tests for exact, idempotent payment entitlements."""

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
    from app.repositories.profiles_repo import consume_premium_allowance, ensure_profile, get_profile
    from app.services.web_payment_service import PROVIDER_YOOKASSA, finalize_external_payment

    init_db()
    def paid_product(user_id: str, product_code: str, expected_field: str, expected: int, *, first_bonus: bool = True) -> None:
        ensure_profile(user_id, "Payment Test")
        payment_id = f"payment-{user_id}-{product_code}"
        external_id = f"provider-{user_id}-{product_code}"
        with db_cursor() as cur:
            if not first_bonus:
                cur.execute("UPDATE profiles SET first_purchase_bonus_used=1 WHERE user_id=?", (user_id,))
            cur.execute(
                """INSERT INTO payments(
                       id,user_id,product_code,stars_amount,status,invoice_payload,
                       provider,currency,amount_value,external_id
                   ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (payment_id, user_id, product_code, 1, "invoice_sent", "test", PROVIDER_YOOKASSA, "RUB", "149.00", external_id),
            )
        assert finalize_external_payment(payment_id, PROVIDER_YOOKASSA, external_id, "succeeded")
        after_first = int((get_profile(user_id) or {}).get(expected_field) or 0)
        assert after_first == expected, (product_code, after_first)
        assert finalize_external_payment(payment_id, PROVIDER_YOOKASSA, external_id, "succeeded")
        after_second = int((get_profile(user_id) or {}).get(expected_field) or 0)
        assert after_second == after_first, (product_code, after_first, after_second)
        with db_cursor() as cur:
            cur.execute("SELECT entitlement_kind,entitlement_units FROM payments WHERE id=?", (payment_id,))
            grant = dict(cur.fetchone())
        assert int(grant["entitlement_units"] or 0) > 0, grant

    paid_product("payment-image-user", "images_10", "image_credits", 12)  # product + first-purchase bonus
    paid_product("payment-voice-user", "voice_game", "voice_credits", 23)  # 20 product + 3 first-purchase bonus
    for code, amount in {"voice_30": 30, "voice_80": 80, "voice_month": 150}.items():
        paid_product(f"exact-{code}", code, "voice_credits", amount, first_bonus=False)
    for code, amount in {"images_10": 10, "images_30": 30, "images_75": 75}.items():
        paid_product(f"exact-{code}", code, "image_credits", amount, first_bonus=False)

    premium_user = "payment-premium-user"
    ensure_profile(premium_user, "Premium Test")
    premium_payment_id = "payment-premium"
    premium_external_id = "provider-premium"
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO payments(
                   id,user_id,product_code,stars_amount,status,invoice_payload,
                   provider,currency,amount_value,external_id
               ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (premium_payment_id, premium_user, "premium_month", 1, "invoice_sent", "test", PROVIDER_YOOKASSA, "RUB", "699.00", premium_external_id),
        )
    assert finalize_external_payment(premium_payment_id, PROVIDER_YOOKASSA, premium_external_id, "succeeded")
    premium = get_profile(premium_user) or {}
    assert premium.get("subscription_status") == "active", premium
    assert int(premium.get("premium_image_remaining") or 0) == 25, premium
    assert int(premium.get("premium_voice_remaining") or 0) == 80, premium
    assert consume_premium_allowance(premium_user, premium, "image", 25)
    assert consume_premium_allowance(premium_user, get_profile(premium_user) or {}, "voice", 80)
    premium_after_use = get_profile(premium_user) or {}
    assert int(premium_after_use.get("premium_image_remaining") or 0) == 24, premium_after_use
    assert int(premium_after_use.get("premium_voice_remaining") or 0) == 79, premium_after_use

    legacy_user = "legacy-voice-package-user"
    ensure_profile(legacy_user, "Legacy Voice")
    with db_cursor() as cur:
        cur.execute("UPDATE profiles SET voice_credits=4,voice_game_credits=2 WHERE user_id=?", (legacy_user,))
    init_db()
    migrated = get_profile(legacy_user) or {}
    assert int(migrated.get("voice_credits") or 0) == 44, migrated
    assert int(migrated.get("voice_game_credits") or 0) == 0, migrated
    init_db()
    assert int((get_profile(legacy_user) or {}).get("voice_credits") or 0) == 44

    print("payment-entitlements-ok")
