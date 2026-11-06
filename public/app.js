// c-r19 client code: request list (localStorage, mail draft only on a click), РРП-300 constructor, table filter, requisites copy.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const norm = (s) => String(s).toLowerCase().replace(/[\s\-–.]/g, "").replace(/ё/g, "е");
  const KEY = "rr-c19-cart"; let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch { cart = []; }
  const toast = (msg) => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2400); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} renderCart(); };
  function add(des, name, where, q = 1) { const it = cart.find((c) => c.des === des && c.where === where); if (it) it.q += q; else cart.push({ des, name, where, q }); save(); toast(`${des}: ${q} шт. в списке запроса`); }
  const cartText = () => cart.map((c, i) => `${i + 1}. ${c.des} ${c.name} (${c.where}), ${c.q} шт.`).join("\n");
  function renderCart() {
    const total = cart.reduce((s, c) => s + c.q, 0);
    $$("[data-cart-count]").forEach((el) => { el.textContent = total; el.hidden = total === 0; });
    $$("[data-cart-open]").forEach((el) => el.setAttribute("aria-label", total ? `Список запроса, всего ${total} шт.` : "Список запроса"));
    $("#cart-empty").hidden = cart.length > 0; $$("#cart [data-need-items]").forEach((b) => { b.disabled = !cart.length; });
    $("#cart-items").innerHTML = cart.map((c, i) => `<li><div><span class="sku" translate="no">${esc(c.des)}</span><span>${esc(c.name)}</span><small>${esc(c.where)}</small></div><label class="sr" for="cq${i}">Количество, ${esc(c.des)}</label><input id="cq${i}" type="number" min="1" inputmode="numeric" value="${c.q}" data-q="${i}"><button type="button" class="cart-x" data-x="${i}" aria-label="Убрать ${esc(c.des)}">×</button></li>`).join("");
  }
  // ---- constructor
  const box = $("[data-config]"), cfgEl = $("#cfg-data");
  const groups = box && cfgEl ? JSON.parse(cfgEl.textContent) : [], sel = {};
  groups.forEach((g) => { sel[g.key] = g.options[g.options.length === 2 ? 1 : 0]; });
  if (groups.length) { sel.hp = groups[0].options[groups[0].options.length - 1]; sel.fwd = groups[1].options[0]; sel.rev = groups[2].options[0]; sel.rot = groups[3].options[groups[3].options.length - 1]; }
  const cfgLine = () => groups.map((g) => `${g.label.replace("Передаточное отношение, ", "").toLowerCase()} ${sel[g.key]}${g.unit || ""}`).join(", ");
  function renderConfig() {
    if (!groups.length) return; const name = box.dataset.model;
    box.innerHTML = `<div class="cfg-groups">${groups.map((g) => `<fieldset class="cfg-g"><legend>${esc(g.label)}</legend><div class="cfg-opts">${g.options.map((o) => `<label class="cfg-o"><input type="radio" name="cfg-${g.key}" value="${esc(o)}" data-cfg="${g.key}"${sel[g.key] === o ? " checked" : ""}><span>${esc(o)}${g.unit || ""}</span></label>`).join("")}</div></fieldset>`).join("")}</div>` +
      `<aside class="cfg-res" aria-live="polite"><p class="cfg-k">Ваша конфигурация</p><p class="cfg-name">${esc(name)}</p><ul class="cfg-sum">${groups.map((g) => `<li><span>${esc(g.label)}</span><b>${esc(sel[g.key])}${g.unit || ""}</b></li>`).join("")}</ul>` +
      `<p class="cfg-note">Гарантия 12 месяцев. Допустимость сочетания и заводской шифр исполнения подтвердит инженер.</p><p class="cfg-btns"><button type="button" class="btn btn-white" data-cfg-add>В список запроса</button></p></aside>`;
  }
  // ---- table filter
  function filterRows(input) {
    const wrap = input.closest(".node-spec, .cat, .wrap") || document, nq = norm(input.value); let shown = 0;
    $$("table.spec tbody tr", wrap).forEach((tr) => { const hit = !nq || norm(tr.textContent).includes(nq); tr.hidden = !hit; shown += hit; });
    const none = $(".none", wrap); if (none) none.hidden = shown > 0;
  }
  document.addEventListener("click", (e) => {
    const t = e.target;
    const ml = t.closest("[data-map-load]"); if (ml) { const m = ml.closest("[data-map]"); m.querySelector(".find-facade").innerHTML = `<iframe class="find-frame" src="${m.dataset.src}" title="Карта проезда, Яндекс.Карты" loading="lazy" allowfullscreen></iframe>`; }
    if (t.closest("[data-cfg-add]")) add(box.dataset.model, cfgLine(), "Конструктор", 1);
    const a = t.closest("[data-add]"); if (a) add(a.dataset.add, a.dataset.name, a.dataset.where, Math.max(1, parseInt(a.parentElement.querySelector("[data-qty]")?.value, 10) || 1));
    if (t.closest("[data-cart-open]")) { renderCart(); $("#cart").showModal(); }
    if (t.closest("[data-cart-close]") || t.id === "cart") $("#cart").close();
    const x = t.closest("[data-x]"); if (x) { cart.splice(+x.dataset.x, 1); save(); }
    if (t.closest("[data-cart-clear]")) { cart = []; save(); }
    if (t.closest("[data-cart-copy]")) navigator.clipboard.writeText(cartText()).then(() => toast("Список скопирован"), () => toast("Не удалось скопировать: выделите список вручную"));
    if (t.closest("[data-cart-mail]")) location.href = `mailto:${$("#cart").dataset.mail}?subject=${encodeURIComponent("Запрос запчастей, реверс-редукторы")}&body=${encodeURIComponent(`Здравствуйте!\n\nПрошу сообщить наличие, цену и срок поставки:\n\n${cartText()}\n\nОрганизация:\nКонтактное лицо:\nТелефон:\n`)}`;
    if (t.closest("[data-copy-req]")) navigator.clipboard.writeText($$("#req div").map((d) => `${d.querySelector("dt").textContent}: ${d.querySelector("dd").textContent}`).join("\n")).then(() => toast("Реквизиты скопированы"), () => toast("Не удалось скопировать: выделите реквизиты вручную"));
  });
  // ---- variant picker on figure pages: show one quantity column; the choice is remembered for the session
  const vtab = $("[data-vtable]"), vsel = $("[data-variant]"), VKEY = "rr-c19-variant";
  function showVariant(i) {
    vtab.classList.remove("cmp"); vtab.classList.add("vsel");
    $$("[data-v]", vtab).forEach((c) => { c.hidden = c.dataset.v !== String(i); });
    $$("tbody tr", vtab).forEach((tr) => { const c = tr.querySelector(`td[data-v="${i}"]`); tr.classList.toggle("na", !!c && /^[—–-]$/.test(c.textContent.trim())); });
  }
  if (vtab && vsel) {
    let saved = null; try { saved = sessionStorage.getItem(VKEY); } catch {}
    const idx = [...vsel.options].findIndex((o) => o.textContent.split(" (")[0] === saved);
    if (idx > 0) vsel.selectedIndex = idx;
    showVariant(vsel.selectedIndex);
    vsel.addEventListener("change", () => { showVariant(vsel.selectedIndex); try { sessionStorage.setItem(VKEY, vsel.selectedOptions[0].textContent.split(" (")[0]); } catch {} });
  }
  document.addEventListener("input", (e) => { if (e.target.matches("[data-filter]")) filterRows(e.target); });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-cfg]")) { sel[t.dataset.cfg] = t.value; renderConfig(); $(`[data-cfg="${t.dataset.cfg}"]:checked`)?.focus(); }
    if (t.matches("[data-q]")) { cart[+t.dataset.q].q = Math.max(1, parseInt(t.value, 10) || 1); save(); }
  });
  const q0 = new URLSearchParams(location.search).get("q"), f0 = $("[data-filter]"); if (q0 && f0) { f0.value = q0; filterRows(f0); }
  renderConfig(); renderCart();
})();
