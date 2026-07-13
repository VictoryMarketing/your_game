# Web payments and email accounts

## 1. What to select in YooKassa

On the screen "How do you plan to accept payments?" select **"On my website"**.

Use these project details during onboarding:

- Website: `https://yourrulesgame.ru/`
- Product: access to an interactive story game, Premium subscription, illustration/voice credits and in-game digital items.
- Integration: API / HTTP Basic Auth.
- Payment method required: SBP (`sbp`), with redirect confirmation.
- Legal status: self-employed, if that is your actual registered tax status.
- There is no physical delivery.

YooKassa supports registered self-employed individuals. Complete identity and tax checks using your real details. Fiscal receipt configuration depends on the agreement selected in the dashboard; confirm it with YooKassa support before enabling live payments.

## 2. What the owner must obtain

After shop activation, obtain:

- `shopId`;
- live secret API key;
- confirmation that SBP is enabled;
- the receipt/fiscalization mode selected for this shop.

Do not send the secret key in chat and do not commit it. Add values directly on the server:

```bash
sudo nano /root/my_game/data/secret.env
```

```dotenv
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_live_secret_key
WEB_PAYMENT_RETURN_URL=https://yourrulesgame.ru/?screen=shop&payment=return

# Enable only when the shop's fiscalization settings require receipt data.
YOOKASSA_SEND_RECEIPT=0
```

In YooKassa dashboard open **Integration -> HTTP notifications** and set:

```text
https://api.yourrulesgame.ru/api/payments/web/yookassa/webhook
```

Subscribe to `payment.succeeded`. The backend verifies every success by requesting the payment from YooKassa before granting a product. Repeated notifications are idempotent.

## 3. Crypto Pay

In `@CryptoBot` open **Crypto Pay -> My Apps**, create an app and copy its API token. Generate a separate random path secret:

```bash
openssl rand -hex 32
```

Add both values to `secret.env`:

```dotenv
CRYPTOPAY_TOKEN=token_from_crypto_pay
CRYPTOPAY_WEBHOOK_SECRET=random_64_hex_characters
```

Enable the webhook in Crypto Pay and enter:

```text
https://api.yourrulesgame.ru/api/payments/web/cryptopay/webhook/<CRYPTOPAY_WEBHOOK_SECRET>
```

The integration accepts RUB-denominated invoices paid in USDT, TON, BTC, ETH or USDC. The backend checks both the secret path and the `crypto-pay-api-signature` HMAC before granting a product.

## 4. Email delivery

Email registration uses secure HttpOnly sessions and PBKDF2 password hashes. Production web play is blocked until the email is verified. For the current Beget mail hosting, first create `noreply@yourrulesgame.ru` in the Beget panel and then add:

```dotenv
ENV=production
WEB_GUEST_ENABLED=0
EMAIL_VERIFICATION_REQUIRED=1
SMTP_HOST=smtp.beget.com
SMTP_PORT=465
SMTP_USERNAME=noreply@yourrulesgame.ru
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@yourrulesgame.ru
SMTP_USE_SSL=1
SMTP_USE_TLS=0
WEB_COOKIE_DOMAIN=.yourrulesgame.ru
```

Beget documents `smtp.beget.com` with protected SSL port `465`. SPF is already delegated to Beget for this domain. Ask Beget support to enable DKIM for SMTP and add a DMARC record before a large launch. Never commit the mailbox password.

## 5. Apply configuration

```bash
sudo systemctl restart yougame-api.service
sudo systemctl status yougame-api.service --no-pager
curl -fsS https://api.yourrulesgame.ru/api/ready
curl -fsS https://api.yourrulesgame.ru/api/payments/web/methods
```

The methods endpoint must show `available: true` for every configured provider.

Test email before opening registration to users:

```bash
curl -i https://api.yourrulesgame.ru/api/auth/web/status
journalctl -u yougame-api.service -n 100 --no-pager
```

Then create a new account from an incognito browser, open the verification link from the email, log out, use "Забыли пароль?" and complete password reset.

Test first with the provider's test shop/application. Verify this sequence:

1. Register a web account and save progress.
2. Open Shop and create an invoice.
3. Complete payment.
4. Return to the Shop; polling must show success without navigating to Home.
5. Confirm that a second delivery of the same webhook does not add credits twice.
6. Check `journalctl -u yougame-api.service` and the payment row in the database.

## 6. Telegram boundary

The standalone website may use YooKassa and Crypto Pay. Digital goods sold inside the Telegram bot or Mini App continue to use Telegram Stars. The backend rejects web checkout methods for Telegram-authenticated users and rejects real-money checkout for anonymous web guests.
