// Pure functions (no DOM) so they can be unit tested with Node.

// ---------- CSV ----------
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ---------- Products ----------
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function slugify(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Accepts "12500", "12.500", "$ 12.500,50", "12500.5"
export function parsePrice(value) {
  let s = String(value ?? '').replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}

const splitList = (value) => String(value ?? '').split(/[|/;]/).map((v) => v.trim()).filter(Boolean);

function isAvailable(value) {
  const v = normalize(String(value ?? ''));
  return !['no', 'false', '0', 'agotado', 'sin stock'].includes(v);
}

export function rowsToProducts(rows) {
  if (rows.length < 2) return [];
  const header = rows[0].map(normalize);
  const col = (name) => header.indexOf(name);
  for (const name of ['nombre', 'precio']) {
    if (col(name) === -1) throw new Error(`Falta la columna "${name}" en la planilla`);
  }
  const get = (row, name) => (col(name) === -1 ? '' : (row[col(name)] ?? '').trim());

  return rows.slice(1).flatMap((row, i) => {
    const name = get(row, 'nombre');
    const price = parsePrice(get(row, 'precio'));
    if (!name || !Number.isFinite(price)) return [];
    return [{
      id: `${slugify(name)}-${i + 1}`,
      name,
      category: get(row, 'categoria') || 'Otros',
      price,
      sizes: splitList(get(row, 'talles')),
      colors: splitList(get(row, 'colores')),
      image: get(row, 'imagen'),
      description: get(row, 'descripcion'),
      available: isAvailable(get(row, 'disponible')),
    }];
  });
}

export function categories(products) {
  return [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function sizes(products) {
  const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const all = [...new Set(products.flatMap((p) => p.sizes))];
  const rank = (s) => (order.includes(s) ? order.indexOf(s) : 100);
  return all.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'es', { numeric: true }));
}

export function filterProducts(products, { category = null, size = null } = {}) {
  return products.filter((p) =>
    (!category || p.category === category) && (!size || p.sizes.includes(size)));
}

// ---------- Prices ----------
const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const formatPrice = (n) => ars.format(n);

// ---------- Bag ----------
export const bagKey = (productId, size, color) => [productId, size ?? '', color ?? ''].join('|');

export function addToBag(bag, product, { size = null, color = null } = {}) {
  const key = bagKey(product.id, size, color);
  const existing = bag.find((item) => item.key === key);
  if (existing) return bag.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item));
  return [...bag, { key, id: product.id, name: product.name, price: product.price, size, color, qty: 1 }];
}

export function changeQty(bag, key, delta) {
  return bag
    .map((item) => (item.key === key ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
}

export const bagCount = (bag) => bag.reduce((n, item) => n + item.qty, 0);
export const bagTotal = (bag) => bag.reduce((sum, item) => sum + item.qty * item.price, 0);

export function whatsappLink(number, bag, storeName) {
  const lines = bag.map((item) => {
    const details = [item.size && `talle ${item.size}`, item.color].filter(Boolean).join(', ');
    return `• ${item.qty} x ${item.name}${details ? ` (${details})` : ''}: ${formatPrice(item.qty * item.price)}`;
  });
  const text = [`Hola! Quiero hacer este pedido en ${storeName}:`, ...lines, `Total: ${formatPrice(bagTotal(bag))}`].join('\n');
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

// ---------- Colors ----------
const COLOR_HEX = {
  negro: '#1c1a1d', blanco: '#f7f5f2', nude: '#d9b8a3', bordo: '#6d1a2e', rojo: '#b3202f',
  rosa: '#e8a6b8', gris: '#8d8a90', azul: '#2c3e70', verde: '#3f6b55', beige: '#d8c7ad',
  lila: '#b39cc9', celeste: '#9cc3dd', marron: '#6b4a3a', champagne: '#e9d7b9',
};
export const colorHex = (name) => COLOR_HEX[normalize(name)] ?? '#c9bfc4';
