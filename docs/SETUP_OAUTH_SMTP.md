# Инструкция: Google OAuth2 + SMTP для PocketBase

## 1. Google OAuth2

### 1.1 Создай проект в Google Cloud Console

1. Иди на [console.cloud.google.com](https://console.cloud.google.com/)
2. Создай новый проект: **Jumpedia** (или выбери существующий)
3. В меню → **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - App name: `Jumpedia`
   - User support email: твой email
   - Authorized domains: `jumpedia.app`
   - Сохрани

### 1.2 Создай OAuth2 credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Jumpedia PocketBase`
4. Authorized redirect URIs:
   ```
   https://jumpedia.app/api/oauth2-redirect
   http://localhost:8090/api/oauth2-redirect
   ```
5. Сохрани → запиши **Client ID** и **Client Secret**

### 1.3 Настрой в PocketBase Admin

1. Зайди в PocketBase Admin: `http://209.46.123.119:8090/_/`
2. **Settings** → **Auth providers** → **Google**
3. Включи, вставь **Client ID** и **Client Secret**
4. Redirect URL уже заполнен автоматически
5. Сохрани

> ⚠️ В Китае Google OAuth2 работает только через VPN. Email-авторизация — основная для CN.

---

## 2. SMTP (для отправки email)

### Вариант A: Gmail (быстро для dev)

1. Включи 2FA на Google аккаунте
2. Создай App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. В PocketBase Admin → **Settings** → **Mail settings**:
   ```
   SMTP Server host: smtp.gmail.com
   Port: 587
   Username: твой@gmail.com
   Password: (App Password из шага 2)
   ```

### Вариант B: Resend.com (бесплатно, для прода)

1. Регистрация на [resend.com](https://resend.com)
2. Добавь домен `jumpedia.app`, настрой DNS-записи (MX, DKIM, SPF)
3. Создай API key
4. В PocketBase Admin → **Settings** → **Mail settings**:
   ```
   SMTP Server host: smtp.resend.com
   Port: 465
   Username: resend
   Password: (API key)
   ```

### Вариант C: Mailgun / SendGrid

Аналогично — берёшь SMTP credentials из их панели.

### Настройка шаблонов

В PocketBase Admin → **Settings** → **Mail settings**:
- **Verification template** — письмо подтверждения email
- **Reset password template** — письмо сброса пароля
- Sender address: `noreply@jumpedia.app`
- Sender name: `Jumpedia`

---

## Проверка

1. Регистрация через email → должно прийти письмо верификации
2. Сброс пароля → письмо с ссылкой
3. Google OAuth2 → редирект на Google → возврат в приложение
