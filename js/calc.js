(() => {
  const defaultPrices = {
    ac: {
      standard_install: { price: 15000, included_route_m: 3, included_cable_channel_m: 1 },
      extra_route_per_m: 1500,
      plug_install: 600
    },
    electric: {
      per_point: 1800,
      chasing_per_point: 900,
      material_multiplier: { concrete: 1.35, brick: 1.15, aerated_concrete: 1.0 }
    },
    plumbing: {
      per_fixture_point: 2200,
      pipe_per_m: 650,
      chasing_per_point: 900,
      material_multiplier: { concrete: 1.35, brick: 1.15, aerated_concrete: 1.0 }
    }
  };

  const fmtRub = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(
      Math.round(n)
    );
  };

  const clamp = (v, min = 0, max = 1_000_000, { int = false } = {}) => {
    const raw = Number(v);
    const n = int ? Math.trunc(raw) : raw;
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const byId = (id) => document.getElementById(id);

  const els = {
    service: byId("calc-service"),
    panels: {
      ac: byId("calc-panel-ac"),
      electric: byId("calc-panel-electric"),
      plumbing: byId("calc-panel-plumbing")
    },
    resultService: byId("calc-result-service"),
    resultTotal: byId("calc-result-total"),
    breakdown: byId("calc-breakdown"),
    ac: {
      routeM: byId("ac-route-m"),
      plug: byId("ac-plug")
    },
    electric: {
      points: byId("el-points"),
      chasing: byId("el-chasing"),
      panel: byId("el-panel"),
      material: byId("el-material")
    },
    plumbing: {
      fixtures: byId("pl-fixtures"),
      pipeM: byId("pl-pipe-m"),
      chasing: byId("pl-chasing"),
      material: byId("pl-material")
    }
  };

  const SERVICE_LABEL = { ac: "Кондиционер", electric: "Электрика", plumbing: "Сантехника" };
  const MATERIAL_LABEL = { concrete: "бетон", brick: "кирпич", aerated_concrete: "газоблок" };

  const setPanelVisibility = (service) => {
    for (const [key, el] of Object.entries(els.panels)) {
      if (!el) continue;
      const active = key === service;
      el.hidden = !active;
      const controls = el.querySelectorAll("input, select, textarea, button");
      controls.forEach((c) => {
        c.disabled = !active;
      });
    }
  };

  const materialInfo = (table, key) => {
    const mult = clamp(table?.[key], 0, 100, { int: false }) || 1;
    return { key, mult, label: MATERIAL_LABEL[key] || key || "—" };
  };

  const buildBlock = (title, lines) => {
    const items = lines.filter(Boolean).map((x) => `<li>${x}</li>`).join("");
    return `<div class="calc__block"><div class="calc__block-title">${title}</div><ul class="calc__list">${items}</ul></div>`;
  };

  const calcAc = (p) => {
    const routeM = clamp(els.ac.routeM?.value ?? 0, 0, 1000);
    const plug = !!els.ac.plug?.checked;

    const base = clamp(p?.standard_install?.price ?? 0, 0, 1_000_000);
    const included = clamp(p?.standard_install?.included_route_m ?? 0, 0, 1000);
    const extraRate = clamp(p?.extra_route_per_m ?? 0, 0, 100_000);

    const extraM = Math.max(0, routeM - included);
    const extra = extraM * extraRate;
    const plugCost = plug ? clamp(p?.plug_install ?? 0, 0, 100_000) : 0;

    const total = base + extra + plugCost;

    const lines = [
      `Стандартная установка: <b>${fmtRub(base)}</b> (включено ${included} м трассы)`,
      extraM > 0
        ? `Доп. трасса: ${extraM} м × ${fmtRub(extraRate)} = <b>${fmtRub(extra)}</b>`
        : `Доп. трасса: <b>${fmtRub(0)}</b>`,
      plug ? `Установка вилки: <b>${fmtRub(plugCost)}</b>` : `Установка вилки: <b>${fmtRub(0)}</b>`
    ];

    return { total, details: buildBlock("Кондиционер", lines), summary: `Кондиционер: ${fmtRub(total)}` };
  };

  const calcElectric = (p) => {
    const points = clamp(els.electric.points?.value ?? 0, 0, 10_000, { int: true });
    const chasing = !!els.electric.chasing?.checked;
    const panel = !!els.electric.panel?.checked;
    const material = els.electric.material?.value || "aerated_concrete";

    const perPoint = clamp(p?.per_point ?? 0, 0, 100_000);
    const chasingPerPoint = chasing ? clamp(p?.chasing_per_point ?? 0, 0, 100_000) : 0;
    const mat = materialInfo(p?.material_multiplier, material);
    const panelCost = panel ? 3000 : 0;

    const work = points * perPoint;
    const chase = points * chasingPerPoint;
    const subtotal = work + chase + panelCost;
    const total = subtotal * mat.mult;

    const lines = [
      `Точки: ${points} × ${fmtRub(perPoint)} = <b>${fmtRub(work)}</b>`,
      chasing
        ? `Штробление: ${points} × ${fmtRub(chasingPerPoint)} = <b>${fmtRub(chase)}</b>`
        : `Штробление: <b>${fmtRub(0)}</b>`,
      panel ? `Сборка щита: <b>${fmtRub(panelCost)}</b>` : `Сборка щита: <b>${fmtRub(0)}</b>`,
      `Материал: ${mat.label} (коэф. ${mat.mult})`,
      `Итого по разделу: <b>${fmtRub(total)}</b>`
    ];

    const detailsText = `Электрика — точки: ${points}, штробление: ${chasing ? "да" : "нет"}, щит: ${panel ? "да" : "нет"}, материал: ${mat.label}.`;
    return { total, details: buildBlock("Электрика", lines), summary: `Электрика: ${fmtRub(total)}`, detailsText };
  };

  const calcPlumbing = (p) => {
    const fixtures = clamp(els.plumbing.fixtures?.value ?? 0, 0, 10_000, { int: true });
    const pipeM = clamp(els.plumbing.pipeM?.value ?? 0, 0, 10_000);
    const chasing = !!els.plumbing.chasing?.checked;
    const material = els.plumbing.material?.value || "aerated_concrete";

    const perFix = clamp(p?.per_fixture_point ?? 0, 0, 100_000);
    const perM = clamp(p?.pipe_per_m ?? 0, 0, 100_000);
    const chasingPerPoint = chasing ? clamp(p?.chasing_per_point ?? 0, 0, 100_000) : 0;
    const mat = materialInfo(p?.material_multiplier, material);

    const fixCost = fixtures * perFix;
    const pipeCost = pipeM * perM;
    const chase = fixtures * chasingPerPoint;
    const subtotal = fixCost + pipeCost + chase;
    const total = subtotal * mat.mult;

    const lines = [
      `Точки сантехники: ${fixtures} × ${fmtRub(perFix)} = <b>${fmtRub(fixCost)}</b>`,
      `Труба/магистраль: ${pipeM} м × ${fmtRub(perM)} = <b>${fmtRub(pipeCost)}</b>`,
      chasing
        ? `Штробление: ${fixtures} × ${fmtRub(chasingPerPoint)} = <b>${fmtRub(chase)}</b>`
        : `Штробление: <b>${fmtRub(0)}</b>`,
      `Материал: ${mat.label} (коэф. ${mat.mult})`,
      `Итого по разделу: <b>${fmtRub(total)}</b>`
    ];

    const detailsText = `Сантехника — точки: ${fixtures}, труба: ${pipeM} м, штробление: ${chasing ? "да" : "нет"}, материал: ${mat.label}.`;
    return { total, details: buildBlock("Сантехника", lines), summary: `Сантехника: ${fmtRub(total)}`, detailsText };
  };

  const update = (prices) => {
    const service = els.service?.value || "ac";
    setPanelVisibility(service);

    let res;
    if (service === "electric") res = calcElectric(prices.electric);
    else if (service === "plumbing") res = calcPlumbing(prices.plumbing);
    else res = calcAc(prices.ac);

    if (els.resultService) els.resultService.textContent = SERVICE_LABEL[service] || "—";
    if (els.resultTotal) els.resultTotal.textContent = fmtRub(res.total);
    if (els.breakdown) els.breakdown.innerHTML = res.details;
  };

  const bind = (prices) => {
    if (!els.service) return;

    const handler = () => update(prices);
    els.service.addEventListener("change", handler);

    const inputs = document.querySelectorAll(
      "#calc-panel-ac input, #calc-panel-ac select, #calc-panel-electric input, #calc-panel-electric select, #calc-panel-plumbing input, #calc-panel-plumbing select"
    );
    inputs.forEach((el) => el.addEventListener("input", handler));

    update(prices);
  };

  const init = async () => {
    const calcRoot = document.querySelector("[data-calc]");
    if (!calcRoot) return;

    let prices;
    let usingFallback = false;
    try {
      const r = await fetch("prices.json", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      prices = await r.json();
    } catch (e) {
      prices = defaultPrices;
      usingFallback = true;
    }

    bind(prices);
    if (usingFallback) {
      // silently fall back to defaultPrices (no UI error)
      console.warn("prices.json not loaded; using defaultPrices");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
