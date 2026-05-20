# vpn_web

Лендинг и checkout для VPN-сервиса. Backend написан на Go, frontend статический без Node-сборки: сервер сам отдает сайт, оформляет покупку, создает пользователя в Remnawave и возвращает ссылку подписки.

## Что уже есть

- Адаптивная VPN-витрина: hero, преимущества, сценарии, тарифы, checkout-форма.
- Checkout-форма: пользователь выбирает тариф, оставляет контакт и получает ссылку подписки после оформления.
- Remnawave-клиент: логин через `/api/auth/login`, создание пользователя через `/api/users`, чтение подписки через `/api/subscriptions/by-username/{username}`.
- Если Remnawave env не заполнены, checkout честно вернет ошибку конфигурации и не покажет фейковую ссылку.

## Быстрый старт

```bash
cp .env.example .env
go run .
```

Сайт откроется на `http://localhost:8080`.

`.env` подхватывается автоматически при старте. Переменные, уже заданные в shell или systemd/docker, имеют приоритет над файлом.

## Что нужно заполнить

Для локального запуска достаточно `.env`. Чтобы checkout реально создавал профиль в Remnawave, заполни:

```bash
REMNAWAVE_BASE_URL=https://panel.example.com
REMNAWAVE_USERNAME=admin
REMNAWAVE_PASSWORD=secret
```

Вместо логина и пароля можно использовать API/JWT-токен:

```bash
REMNAWAVE_BASE_URL=https://panel.example.com
REMNAWAVE_TOKEN=...
```

Если в панели пользователи должны попадать в конкретные Internal Squads, укажи их UUID через запятую:

```bash
REMNAWAVE_INTERNAL_SQUADS=uuid-1,uuid-2
```

Переключатель онлайн-оформления:

```bash
PAYMENT_STUB_ENABLED=true
```

При включенном оформлении сайт создает пользователя через Remnawave API и возвращает ссылку подписки. Старый ключ `PAYMENT_STUB_PUBLIC_MOCK_ENABLED` еще поддерживается для совместимости, но новый основной ключ — `PAYMENT_STUB_ENABLED`.

## API

- `GET /api/health` — состояние сервера.
- `GET /api/config` — публичный конфиг для фронта.
- `GET /api/plans` — тарифы.
- `POST /api/checkout` — оформление и автоматическая выдача подписки через Remnawave.
- `GET /api/checkout/{id}` — технически проверить результат оформления.

Для production реальный платежный webhook должен вызывать тот же процесс выдачи только после подтвержденной оплаты.

## Remnawave

Минимальные env:

```bash
REMNAWAVE_BASE_URL=https://panel.example.com
REMNAWAVE_USERNAME=admin
REMNAWAVE_PASSWORD=secret
```

Или готовый JWT:

```bash
REMNAWAVE_BASE_URL=https://panel.example.com
REMNAWAVE_TOKEN=...
```

Еще на стороне Remnawave должны быть настроены Node, Hosts/Inbounds и Internal Squads, иначе пользователь создастся, но подписка может не содержать рабочих ссылок.

Тарифы сейчас заданы в `internal/checkout/plans.go`, а checkout-история сохраняется в `data/checkouts.json`.
