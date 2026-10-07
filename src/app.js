import { CONFIG } from './config.js';
import {
  parseCSV, rowsToProducts, categories, sizes, filterProducts, formatPrice,
  addToBag, changeQty, bagCount, bagTotal, whatsappLink, colorHex,
} from './logic.js';

const $ = (id) => document.getElementById(id);
const state = { products: [], category: null, size: null, bag: loadBag() };

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// ---------- Bag persistence (only on this device) ----------
function loadBag() {
  try { return JSON.parse(localStorage.getItem('bag')) ?? []; } catch { return []; }
}
function saveBag() {
  try { localStorage.setItem('bag', JSON.stringify(state.bag)); } catch { /* private mode */ }
}

// ---------- Data ----------
async function loadProducts() {
  const url = CONFIG.sheetCsvUrl || CONFIG.localCsv;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo leer el catálogo (${response.status})`);
  return rowsToProducts(parseCSV(await response.text()));
}

// ---------- Filters ----------
function renderFilters() {
  const chips = $('category-filter');
  const options = [null, ...categories(state.products)];
  chips.replaceChildren(...options.map((category) => {
    const button = el('button', { type: 'button', textContent: category ?? 'Todo' });
    button.setAttribute('aria-pressed', String(state.category === category));
    button.addEventListener('click', () => { state.category = category; renderFilters(); renderCatalog(); });
    return button;
  }));
  chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

  const select = $('size-filter');
  if (select.options.length === 1) {
    select.append(...sizes(state.products).map((s) => el('option', { value: s, textContent: s })));
    select.addEventListener('change', () => { state.size = select.value || null; renderCatalog(); });
  }
}

// ---------- Catalog ----------
function productVisual(product) {
  const visual = el('div', { className: 'product-visual' });
  if (product.image) {
    visual.append(el('img', { src: product.image, alt: product.name, loading: 'lazy' }));
  } else {
    // No photo yet: show the product colors as vertical bands.
    const colors = product.colors.length ? product.colors : ['gris'];
    colors.forEach((c) => {
      const band = el('div', { className: 'band' });
      band.style.background = colorHex(c);
      visual.append(band);
    });
    const initial = el('span', { className: 'initial', textContent: product.name[0] });
    initial.setAttribute('aria-hidden', 'true');
    visual.append(initial);
  }
  if (!product.available) visual.append(el('span', { className: 'sold-out', textContent: 'Sin stock' }));
  return visual;
}

function optionRow(label, values, render, onSelect) {
  const row = el('div', { className: 'option-row', role: 'group' });
  row.setAttribute('aria-label', label);
  const buttons = values.map((value) => {
    const button = el('button', { className: 'option', type: 'button' }, ...render(value));
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      onSelect(value);
    });
    return button;
  });
  row.append(...buttons);
  return { row, buttons };
}

function productCard(product) {
  const choice = { size: null, color: product.colors[0] ?? null };
  const hint = el('p', { className: 'hint', role: 'status' });
  const add = el('button', {
    className: 'btn primary',
    type: 'button',
    textContent: product.available ? 'Agregar al pedido' : 'Sin stock',
    disabled: !product.available,
  });

  const card = el('li', { className: 'product' },
    productVisual(product),
    el('h3', { textContent: product.name }),
    el('p', { className: 'price', textContent: formatPrice(product.price) }));
  if (product.description) card.append(el('p', { className: 'desc', textContent: product.description }));

  if (product.colors.length) {
    const { row, buttons } = optionRow('Color', product.colors, (c) => {
      const dot = el('span', { className: 'swatch' });
      dot.style.background = colorHex(c);
      return [dot, c];
    }, (c) => { choice.color = c; });
    buttons[0].setAttribute('aria-pressed', 'true');
    card.append(row);
  }
  if (product.sizes.length) {
    const { row } = optionRow('Talle', product.sizes, (s) => [s], (s) => { choice.size = s; hint.textContent = ''; });
    card.append(row);
  }

  add.addEventListener('click', () => {
    if (product.sizes.length && !choice.size) {
      hint.textContent = 'Elegí un talle.';
      return;
    }
    state.bag = addToBag(state.bag, product, choice);
    saveBag();
    renderBag();
    hint.textContent = 'Agregado al pedido.';
  });
  card.append(add, hint);
  return card;
}

function renderCatalog() {
  const visible = filterProducts(state.products, { category: state.category, size: state.size });
  $('catalog').replaceChildren(...visible.map(productCard));
  const notice = $('notice');
  notice.hidden = visible.length > 0;
  notice.textContent = 'No hay productos con esos filtros. Probá con otro talle o categoría.';
}

// ---------- Bag ----------
function renderBag() {
  const count = bagCount(state.bag);
  const bar = $('bag-bar');
  bar.hidden = count === 0;
  $('bag-count').textContent = `Ver pedido (${count})`;
  $('bag-total').textContent = formatPrice(bagTotal(state.bag));
  $('bag-dialog-total').textContent = formatPrice(bagTotal(state.bag));
  $('send-order').href = whatsappLink(CONFIG.whatsappNumber, state.bag, CONFIG.storeName);

  $('bag-items').replaceChildren(...state.bag.map((item) => {
    const minus = el('button', { type: 'button', textContent: '−' });
    const plus = el('button', { type: 'button', textContent: '+' });
    minus.setAttribute('aria-label', `Quitar uno de ${item.name}`);
    plus.setAttribute('aria-label', `Agregar uno de ${item.name}`);
    minus.addEventListener('click', () => updateQty(item.key, -1));
    plus.addEventListener('click', () => updateQty(item.key, 1));
    const meta = [item.size && `Talle ${item.size}`, item.color].filter(Boolean).join(' · ');
    return el('li', {},
      el('div', {}, el('div', { textContent: item.name }), el('div', { className: 'meta', textContent: meta }),
        el('div', { textContent: formatPrice(item.price * item.qty) })),
      el('div', { className: 'qty' }, minus, el('span', { textContent: String(item.qty) }), plus));
  }));
  if (count === 0 && $('bag').open) $('bag').close();
}

function updateQty(key, delta) {
  state.bag = changeQty(state.bag, key, delta);
  saveBag();
  renderBag();
}

// ---------- Start ----------
async function start() {
  document.title = CONFIG.storeName;
  $('store-name').textContent = CONFIG.storeName;
  $('tagline').textContent = CONFIG.tagline;
  $('bag-bar').addEventListener('click', () => $('bag').showModal());
  $('bag-close').addEventListener('click', () => $('bag').close());
  $('bag').addEventListener('click', (e) => { if (e.target === $('bag')) $('bag').close(); });
  renderBag();

  const notice = $('notice');
  notice.hidden = false;
  notice.textContent = 'Cargando productos…';
  try {
    state.products = await loadProducts();
    renderFilters();
    renderCatalog();
  } catch (error) {
    notice.textContent = `${error.message}. Revisá el link de la planilla en src/config.js.`;
  }
}

start();
