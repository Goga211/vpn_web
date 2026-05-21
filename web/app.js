const state = {
  brandName: "NorthVPN",
  supportTelegramUrl: "https://t.me/your_vpn_support",
  supportEmail: "support@example.com",
  provisioningEnabled: false,
  checkoutEnabled: true,
  plans: [],
  selectedPlanId: "quarter",
};

applySavedTheme();

const icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></svg>',
};

document.addEventListener("DOMContentLoaded", () => {
  bindTheme();
  bindForms();
  loadInitialData();
});

function applySavedTheme() {
  const saved = localStorage.getItem("vpn-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
}

function bindTheme() {
  const button = document.querySelector("#themeToggle");
  button?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("vpn-theme", next);
  });
}

function bindForms() {
  document.querySelector("#checkoutForm")?.addEventListener("submit", submitCheckout);
  document.querySelector("#planSelect")?.addEventListener("change", (event) => {
    selectPlan(event.currentTarget.value);
  });
  document.querySelector("#dialogClose")?.addEventListener("click", () => {
    document.querySelector("#accessDialog")?.close();
  });
}

async function loadInitialData() {
  await Promise.all([loadConfig(), loadPlans()]);
  renderConfigNotice();
}

async function loadConfig() {
  try {
    const config = await getJSON("/api/config");
    state.brandName = config.brandName || state.brandName;
    state.supportTelegramUrl = config.supportTelegramUrl || state.supportTelegramUrl;
    state.supportEmail = config.supportEmail || state.supportEmail;
    state.provisioningEnabled = Boolean(config.provisioningEnabled);
    state.checkoutEnabled = config.checkoutEnabled !== false;

    document.title = `${state.brandName} — стабильный VPN для работы и дома`;
    document.querySelectorAll("[data-brand]").forEach((node) => {
      node.textContent = state.brandName;
    });
    document.querySelectorAll(".support-link").forEach((node) => {
      node.href = state.supportTelegramUrl;
    });
  } catch (error) {
    console.warn("Config loading failed", error);
  }
}

async function loadPlans() {
  try {
    const data = await getJSON("/api/plans");
    state.plans = Array.isArray(data.plans) ? data.plans : [];
  } catch (error) {
    console.warn("Plan loading failed", error);
    state.plans = fallbackPlans();
  }

  if (!state.plans.some((plan) => plan.id === state.selectedPlanId) && state.plans[0]) {
    state.selectedPlanId = state.plans[0].id;
  }
  renderPlans();
  renderPlanSelect();
}

function renderPlans() {
  const grid = document.querySelector("#pricingGrid");
  if (!grid) return;
  grid.innerHTML = "";

  state.plans.forEach((plan) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = [
      "card",
      "price-card",
      plan.popular ? "popular" : "",
      plan.id === state.selectedPlanId ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    card.setAttribute("aria-pressed", String(plan.id === state.selectedPlanId));
    card.addEventListener("click", () => selectPlan(plan.id));
    card.innerHTML = `
      <div class="price-top">
        <span class="price-name">${escapeHTML(plan.name)}</span>
        ${plan.oldPriceRub ? `<span class="price-old">${formatPrice(plan.oldPriceRub)}</span>` : ""}
      </div>
      <div class="price-value">${formatPrice(plan.priceRub)}</div>
      <p>${escapeHTML(plan.highlight || "Подписка VPN")}</p>
      <div class="price-meta">
        <span>${escapeHTML(plan.period)}</span>
        <span>${plan.trafficLimitGb > 0 ? `${plan.trafficLimitGb} ГБ` : "Безлимит"}</span>
        <span>${plan.devices} устр.</span>
      </div>
    `;
    grid.append(card);
  });
}

function renderPlanSelect() {
  const select = document.querySelector("#planSelect");
  if (!select) return;
  select.innerHTML = "";

  state.plans.forEach((plan) => {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = `${plan.name} · ${formatPrice(plan.priceRub)} · ${plan.period}`;
    option.selected = plan.id === state.selectedPlanId;
    select.append(option);
  });
  select.value = state.selectedPlanId;
}

function renderConfigNotice() {
  const notice = document.querySelector("#configNotice");
  if (!notice) return;

  if (!state.checkoutEnabled) {
    notice.hidden = false;
    notice.textContent = "Онлайн-оформление временно недоступно. Напишите в поддержку, чтобы получить доступ.";
    return;
  }
  if (!state.provisioningEnabled) {
    notice.hidden = false;
    notice.textContent = "Автоматическая выдача временно недоступна. Напишите в поддержку, и мы поможем оформить доступ.";
    return;
  }
  notice.hidden = true;
}

function selectPlan(planId) {
  state.selectedPlanId = planId;
  const select = document.querySelector("#planSelect");
  if (select) select.value = planId;
  renderPlans();
}

async function submitCheckout(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("#formStatus");
  const button = form.querySelector("button[type='submit']");
  setStatus(status, "Проверяем оплату и активируем подписку...");
  button.disabled = true;

  const formData = new FormData(form);
  const payload = {
    planId: formData.get("planId"),
    telegram: String(formData.get("telegram") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
    consent: formData.get("consent") === "on",
  };

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new CheckoutError(data?.error?.message || "Не удалось выпустить доступ", data.checkout);

    setStatus(status, "Готово: доступ активирован, ссылка подписки получена.");
    showAccessDialog(data.checkout, data.payment);
    form.reset();
    renderPlanSelect();
  } catch (error) {
    if (error.checkout) {
      showFailureDialog(error.checkout, error.message);
    }
    setStatus(status, error.message, true);
  } finally {
    button.disabled = false;
  }
}

function showAccessDialog(checkout, payment) {
  const dialog = document.querySelector("#accessDialog");
  const body = document.querySelector("#dialogBody");
  const title = document.querySelector("#dialogTitle");
  if (!dialog || !body) return;
  if (title) title.textContent = "Доступ готов";

  body.innerHTML = `
    <p class="muted">${escapeHTML(payment?.message || checkout.paymentMessage || "Доступ активирован. Ссылка подписки готова.")}</p>
    ${renderCheckoutSummary(checkout)}
    <div class="subscription-result">
      <span class="panel-label">Страница подписки</span>
      <a href="${escapeAttr(checkout.subscriptionUrl)}" target="_blank" rel="noreferrer">${escapeHTML(checkout.subscriptionUrl)}</a>
      <button class="button button-secondary" type="button" data-copy="${escapeHTML(checkout.subscriptionUrl)}">
        ${icons.copy}<span>Скопировать</span>
      </button>
    </div>
    <div class="dialog-actions">
      <a class="button button-primary" href="${escapeAttr(checkout.subscriptionUrl)}" target="_blank" rel="noreferrer">
        ${icons.arrow}<span>Открыть подписку</span>
      </a>
      <a class="button button-secondary support-link" href="${escapeAttr(state.supportTelegramUrl)}" target="_blank" rel="noreferrer">Поддержка</a>
    </div>
  `;
  body.querySelector("[data-copy]")?.addEventListener("click", (event) => {
    copyText(event.currentTarget.dataset.copy);
  });
  dialog.showModal();
}

function showFailureDialog(checkout, message) {
  const dialog = document.querySelector("#accessDialog");
  const body = document.querySelector("#dialogBody");
  const title = document.querySelector("#dialogTitle");
  if (!dialog || !body) return;
  if (title) title.textContent = "Выдача не прошла";

  body.innerHTML = `
    <p class="muted">${escapeHTML(message)}</p>
    ${renderCheckoutSummary(checkout)}
    <div class="dialog-actions">
      <a class="button button-primary support-link" href="${escapeAttr(state.supportTelegramUrl)}" target="_blank" rel="noreferrer">
        ${icons.arrow}<span>Написать в поддержку</span>
      </a>
      <button class="button button-secondary" type="button" data-close-dialog>Закрыть</button>
    </div>
  `;
  body.querySelector("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.showModal();
}

function renderCheckoutSummary(checkout) {
  return `
    <div class="checkout-summary">
      <div><strong>Тариф:</strong> ${escapeHTML(checkout.planName)} (${formatPrice(checkout.priceRub)})</div>
      <div><strong>Статус:</strong> ${escapeHTML(statusLabel(checkout.status))}</div>
      ${checkout.username ? `<div><strong>Профиль:</strong> ${escapeHTML(checkout.username)}</div>` : ""}
    </div>
  `;
}

async function getJSON(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Ошибка запроса");
  return data;
}

function setStatus(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("error", Boolean(isError));
}

function statusLabel(status) {
  return (
    {
      paid: "оплата подтверждена",
      provisioned: "доступ выдан",
      failed: "ошибка выдачи",
    }[status] || status
  );
}

function formatPrice(value) {
  if (!value) return "0 ₽";
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(value).catch(() => {});
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}

function fallbackPlans() {
  return [
    { id: "month", name: "1 месяц", period: "30 дней", priceRub: 299, trafficLimitGb: 0, devices: 5, highlight: "Гибкий старт" },
    { id: "quarter", name: "3 месяца", period: "90 дней", priceRub: 799, oldPriceRub: 897, trafficLimitGb: 0, devices: 5, popular: true, highlight: "Оптимально на каждый день" },
  ];
}

class CheckoutError extends Error {
  constructor(message, checkout) {
    super(message);
    this.name = "CheckoutError";
    this.checkout = checkout;
  }
}
