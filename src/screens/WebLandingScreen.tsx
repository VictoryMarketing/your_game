import { ArrowLeft, KeyRound, LogIn, Mail, Send, Sparkles, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  loginWebAccount,
  registerWebAccount,
  resendVerificationEmail,
  requestPasswordReset,
  resetWebPassword,
  verifyWebEmail,
} from "../api/profileApi";
import { telegramMiniAppLink } from "../telegram/telegram";

type AuthMode = "welcome" | "login" | "register" | "forgot" | "reset" | "verify";

export function WebLandingScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset_password") || "";
  const verifyToken = params.get("verify_email") || "";
  const [mode, setMode] = useState<AuthMode>(verifyToken ? "verify" : resetToken ? "reset" : "welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(Boolean(verifyToken));
  const [message, setMessage] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  useEffect(() => {
    if (!verifyToken) return;
    verifyWebEmail(verifyToken)
      .then(() => {
        setMessage("Email подтверждён. Открываем твою библиотеку...");
        window.setTimeout(onAuthenticated, 500);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Ссылка подтверждения устарела."))
      .finally(() => setBusy(false));
  }, [onAuthenticated, verifyToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        const result = await registerWebAccount({
          name,
          email,
          password,
          terms_accepted: termsAccepted,
          personal_data_consent: personalDataConsent,
          age_confirmed: ageConfirmed,
          legal_version: "2026-07-13",
        });
        if (result.verification_required) {
          setAwaitingVerification(true);
          setMessage("Проверь почту: мы отправили ссылку для подтверждения аккаунта.");
        } else {
          onAuthenticated();
        }
      } else if (mode === "login") {
        await loginWebAccount({ email, password });
        onAuthenticated();
      } else if (mode === "forgot") {
        const result = await requestPasswordReset(email);
        setMessage(result.message || "Если аккаунт существует, письмо уже отправлено.");
      } else if (mode === "reset") {
        await resetWebPassword(resetToken, password);
        onAuthenticated();
      }
    } catch (error) {
      if (mode === "register" && error instanceof Error && error.message.toLowerCase().includes("письм")) {
        setAwaitingVerification(true);
      }
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить запрос.");
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!email) return;
    setBusy(true);
    try {
      const result = await resendVerificationEmail(email);
      setMessage(result.message || "Новое письмо отправлено.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось повторить отправку.");
    } finally {
      setBusy(false);
    }
  }

  const authMode = mode !== "welcome";
  return (
    <main className="web-auth-shell">
      <section className="web-auth-visual" aria-hidden="true">
        <div className="web-auth-map-lines" />
        <span className="eyebrow">Интерактивная игра-книга</span>
        <h1>История помнит каждый выбор</h1>
        <p>Создай героя, раскрой тайну и получи финал, которого не будет у другого игрока.</p>
        <div className="web-feature-pills">
          <span>Живые последствия</span><span>Улики и отношения</span><span>Своя концовка</span>
        </div>
      </section>

      <section className="web-auth-card">
        <div className="brand-mark compact"><img src={`${import.meta.env.BASE_URL}images/icon_YG.png`} alt="Твои правила" /></div>
        {authMode && mode !== "verify" && (
          <button className="auth-back" onClick={() => { setMode("welcome"); setMessage(""); }} type="button">
            <ArrowLeft size={17} /> Назад
          </button>
        )}

        {mode === "welcome" && (
          <>
            <div className="web-auth-copy">
              <span className="eyebrow">Твои правила</span>
              <h2>Начни свою книгу</h2>
              <p>Аккаунт сохранит истории, предметы и покупки на всех устройствах.</p>
            </div>
            <div className="auth-actions">
              <button className="primary-button tall" onClick={() => setMode("register")} type="button"><UserPlus size={19} /> Создать аккаунт</button>
              <button className="secondary-button" onClick={() => setMode("login")} type="button"><LogIn size={18} /> Войти по email</button>
              <button className="telegram-button" onClick={() => window.open(telegramMiniAppLink(), "_blank")} type="button"><Send size={18} /> Открыть в Telegram</button>
            </div>
          </>
        )}

        {mode === "verify" && (
          <div className="auth-status"><Mail size={30} /><h2>Подтверждаем email</h2><p>{message || "Проверяем защищённую ссылку..."}</p>{busy && <i className="auth-spinner" />}</div>
        )}

        {mode !== "welcome" && mode !== "verify" && (
          <form className="auth-form" onSubmit={submit}>
            <div className="web-auth-copy">
              <span className="eyebrow">{mode === "register" ? "Новая библиотека" : mode === "login" ? "С возвращением" : "Восстановление"}</span>
              <h2>{mode === "register" ? "Создать аккаунт" : mode === "login" ? "Войти" : mode === "forgot" ? "Вернуть доступ" : "Новый пароль"}</h2>
            </div>
            {mode === "register" && <label className="field"><span>Имя</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={32} required placeholder="Как к тебе обращаться" /></label>}
            {mode !== "reset" && <label className="field"><span>Email</span><input autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="name@example.com" /></label>}
            {mode !== "forgot" && <label className="field"><span>Пароль</span><input autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required type="password" placeholder="Не меньше 8 символов, буквы и цифры" /></label>}
            {mode === "register" && (
              <fieldset className="auth-consents">
                <legend>Перед созданием аккаунта</legend>
                <label className="auth-consent-row">
                  <input checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required type="checkbox" />
                  <span>Принимаю <a href={`${import.meta.env.BASE_URL}terms.html`} rel="noreferrer" target="_blank">условия использования и покупки</a>.</span>
                </label>
                <label className="auth-consent-row">
                  <input checked={personalDataConsent} onChange={(event) => setPersonalDataConsent(event.target.checked)} required type="checkbox" />
                  <span>Даю <a href={`${import.meta.env.BASE_URL}personal-data-consent.html`} rel="noreferrer" target="_blank">согласие на обработку персональных данных</a> и ознакомлен(а) с <a href={`${import.meta.env.BASE_URL}privacy.html`} rel="noreferrer" target="_blank">политикой конфиденциальности</a>.</span>
                </label>
                <label className="auth-consent-row">
                  <input checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} required type="checkbox" />
                  <span>Мне исполнилось 14 лет либо регистрацию одобрил законный представитель.</span>
                </label>
              </fieldset>
            )}
            {message && <p className="auth-message" role="status">{message}</p>}
            <button className="primary-button tall" disabled={busy || (mode === "register" && (!termsAccepted || !personalDataConsent || !ageConfirmed))} type="submit">
              {busy ? <i className="auth-spinner small" /> : mode === "forgot" ? <Mail size={18} /> : mode === "reset" ? <KeyRound size={18} /> : <Sparkles size={18} />}
              {busy ? "Подождите..." : mode === "register" ? "Создать и начать" : mode === "login" ? "Войти в игру" : mode === "forgot" ? "Отправить ссылку" : "Сохранить пароль"}
            </button>
            {mode === "register" && awaitingVerification && <button className="text-button" disabled={busy} onClick={resendVerification} type="button"><Mail size={17} /> Отправить письмо ещё раз</button>}
            {mode === "login" && <button className="text-button" onClick={() => { setMode("forgot"); setMessage(""); }} type="button">Забыли пароль?</button>}
            {(mode === "forgot" || mode === "reset") && <button className="text-button" onClick={() => { setMode("login"); setMessage(""); }} type="button">Вернуться ко входу</button>}
          </form>
        )}
        <nav className="web-legal-links" aria-label="Правовая информация">
          <a href={`${import.meta.env.BASE_URL}terms.html`} target="_blank" rel="noreferrer">Условия</a>
          <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">Конфиденциальность</a>
          <a href={`${import.meta.env.BASE_URL}requisites.html`} target="_blank" rel="noreferrer">Реквизиты</a>
        </nav>
      </section>
    </main>
  );
}
