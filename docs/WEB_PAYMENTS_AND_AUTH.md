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

### Test YooMoney checkout while the live shop is being reviewed

Create a **test shop for payment acceptance**, not a payout gateway. A payout gateway exposes an `agentId` and is intended for sending money to users; it cannot authenticate `/v3/payments` for store purchases.

For the test shop, obtain its `shopId` and server secret under **API keys**. The mobile SDK key is not used by this React web app or FastAPI backend. Add the server values only to a protected server env file:

```dotenv
YOOKASSA_TEST_ENABLED=1
YOOKASSA_TEST_SHOP_ID=your_test_shop_id
YOOKASSA_TEST_SECRET_KEY=your_test_server_secret
```

The deployed server loads `/root/my_game/data/payments-test.env` through the systemd drop-in `/etc/systemd/system/yougame-api.service.d/30-payments-test.conf`. Keep the env file at mode `600` and never commit it.

Configure this dedicated callback in the **test shop**:

```text
https://api.yourrulesgame.ru/api/payments/web/yookassa-test/webhook
```

Subscribe to `payment.succeeded`. The web shop then shows **ЮMoney · тест**. Test checkout uses `payment_method_data.type=yoo_money`, requires YooKassa to return `test=true`, validates amount/product/currency against the local order and records `test_paid`. It deliberately does not grant Premium, credits, branches or artifacts and does not create a tax receipt task.

SBP cannot be tested in a YooKassa test shop. The test shop supports test bank cards and the YooMoney wallet flow; use the live shop credentials later for real SBP.

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
YOOKASSA_YOOMONEY_ENABLED=0
WEB_PAYMENT_RETURN_URL=https://yourrulesgame.ru/?screen=shop&payment=return

# Enable only when the shop's fiscalization settings require receipt data.
YOOKASSA_SEND_RECEIPT=0
```

In YooKassa dashboard open **Integration -> HTTP notifications** and set:

```text
https://api.yourrulesgame.ru/api/payments/web/yookassa/webhook
```

Subscribe to `payment.succeeded`. The backend verifies every success by requesting the payment from YooKassa before granting a product. Repeated notifications are idempotent.

After YooKassa confirms that wallet payments are enabled for the live shop, set `YOOKASSA_YOOMONEY_ENABLED=1`. The same live webhook handles both `yookassa_sbp` and `yookassa_yoomoney`, but it reads the expected provider from the local order and verifies the remote payment before granting access.

## 3. Crypto Pay: technical preparation only

Do not enable this provider in production for a Russian resident or Russian self-employed operator without a written opinion from a qualified lawyer. Article 14 of Federal Law 259-FZ prohibits Russian legal entities and individuals who are in Russia for at least 183 days during 12 consecutive months from accepting digital currency as consideration for goods or services. It also prohibits public offers to accept it. The code is an integration scaffold, not a recommendation to activate crypto checkout.

For testnet or a future legally eligible operating entity:

In `@CryptoTestnetBot` open **Crypto Pay -> My Apps**, create an app and copy its test API token. Generate a separate random path secret:

```bash
openssl rand -hex 32
```

Add both values to `secret.env`:

```dotenv
CRYPTOPAY_TOKEN=token_from_crypto_pay
CRYPTOPAY_WEBHOOK_SECRET=random_64_hex_characters
CRYPTOPAY_ENABLED=0
```

Open **Crypto Pay -> My Apps -> your app -> Webhooks**, enable webhooks and enter:

```text
https://api.yourrulesgame.ru/api/payments/web/cryptopay/webhook/<CRYPTOPAY_WEBHOOK_SECRET>
```

The integration creates RUB-denominated invoices payable in USDT, TON, BTC, ETH or USDC at the provider exchange rate. The backend checks both the secret path and the `crypto-pay-api-signature` HMAC before granting a product. Set `CRYPTOPAY_ENABLED=1` only in a permitted test or production context. Do not replace the test token with a mainnet token until the legal restriction is resolved for the actual operator.

## 4. RUB prices and Stars comparison

| Product | Telegram | Website |
| --- | ---: | ---: |
| Premium month | 449 Stars | 699 RUB |
| 20 voice uses for a game | 129 Stars | 199 RUB |
| 30 voice credits | 229 Stars | 349 RUB |
| 80 voice credits | 449 Stars | 699 RUB |
| 150 voice credits | 690 Stars | 1,090 RUB |
| 3 bonus branches | 89 Stars | 149 RUB |
| 10 images | 90 Stars | 149 RUB |
| 30 images | 229 Stars | 349 RUB |
| 75 images | 449 Stars | 699 RUB |
| 3 artifacts | 129 Stars | 199 RUB |
| Rare/epic artifact | 249 Stars | 399 RUB |
| Legendary/mythic artifact | 499 Stars | 799 RUB |

The website range is approximately 1.52-1.67 RUB per Star equivalent. Telegram's retail Star price varies by country, tax and purchase channel, so this is a product-value comparison, not a currency conversion. Crypto Pay, when legally usable, converts the same RUB price at its current exchange rate.

## 5. Email delivery

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

## 6. Apply configuration

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

For a self-employed operator, YooKassa does not currently register receipts in `Мой налог`. After every external payment:

1. Run `/receipts` as the bot administrator.
2. Register the listed income manually in `Мой налог` using the real product title and amount.
3. Send the receipt to the buyer's email.
4. Run `/receipt <payment_id>` to close the internal receipt task.

Keep `YOOKASSA_SEND_RECEIPT=0`: YooKassa's own receipt option is currently intended for companies and individual entrepreneurs, not self-employed NPD payers.

## 7. Telegram boundary

The standalone website may use YooKassa and Crypto Pay. Digital goods sold inside the Telegram bot or Mini App continue to use Telegram Stars. The backend rejects web checkout methods for Telegram-authenticated users and rejects real-money checkout for anonymous web guests.
