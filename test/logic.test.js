import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseCSV, parsePrice, rowsToProducts, categories, sizes, filterProducts,
  addToBag, changeQty, bagCount, bagTotal, whatsappLink, slugify, colorHex,
} from '../src/logic.js';

test('parseCSV handles quotes, commas inside quotes, escaped quotes and CRLF', () => {
  const csv = 'a,b,c\r\n1,"hola, mundo","dijo ""sí"""\r\n\r\n2,x,y';
  assert.deepEqual(parseCSV(csv), [['a', 'b', 'c'], ['1', 'hola, mundo', 'dijo "sí"'], ['2', 'x', 'y']]);
});

test('parseCSV keeps line breaks inside quoted fields and strips the BOM', () => {
  assert.deepEqual(parseCSV('\uFEFFn,d\nA,"linea1\nlinea2"\n'), [['n', 'd'], ['A', 'linea1\nlinea2']]);
});

test('parsePrice understands Argentine formats', () => {
  assert.equal(parsePrice('12500'), 12500);
  assert.equal(parsePrice('12.500'), 12500);
  assert.equal(parsePrice('$ 1.234.567'), 1234567);
  assert.equal(parsePrice('$ 12.500,50'), 12500.5);
  assert.equal(parsePrice('99.90'), 99.9);
  assert.ok(Number.isNaN(parsePrice('')));
  assert.ok(Number.isNaN(parsePrice('consultar')));
});

test('rowsToProducts maps columns regardless of accents and case', () => {
  const rows = parseCSV('Nombre,Categoría,PRECIO,Talles,Disponible\nTop,Corpiños,"9.900",S|M,NO\n');
  const [p] = rowsToProducts(rows);
  assert.equal(p.name, 'Top');
  assert.equal(p.category, 'Corpiños');
  assert.equal(p.price, 9900);
  assert.deepEqual(p.sizes, ['S', 'M']);
  assert.equal(p.available, false);
});

test('rowsToProducts skips incomplete rows and defaults missing values', () => {
  const products = rowsToProducts(parseCSV('nombre,precio\n,1000\nSin precio,\nOk,500\n'));
  assert.equal(products.length, 1);
  assert.equal(products[0].category, 'Otros');
  assert.equal(products[0].available, true);
});

test('rowsToProducts explains a missing required column', () => {
  assert.throws(() => rowsToProducts([['nombre'], ['x']]), /precio/);
});

test('the sample CSV shipped with the store is valid', () => {
  const csv = readFileSync(new URL('../data/productos.csv', import.meta.url), 'utf8');
  const products = rowsToProducts(parseCSV(csv));
  assert.equal(products.length, 8);
  assert.ok(products.every((p) => p.price > 0 && p.sizes.length > 0));
});

test('categories and sizes are unique and sorted sensibly', () => {
  const products = [
    { category: 'Pijamas', sizes: ['XL', 'S'] },
    { category: 'Bodies', sizes: ['M', 'S'] },
    { category: 'Pijamas', sizes: ['XXL'] },
  ];
  assert.deepEqual(categories(products), ['Bodies', 'Pijamas']);
  assert.deepEqual(sizes(products), ['S', 'M', 'XL', 'XXL']);
});

test('filterProducts combines category and size', () => {
  const products = [
    { id: 1, category: 'A', sizes: ['S'] },
    { id: 2, category: 'A', sizes: ['M'] },
    { id: 3, category: 'B', sizes: ['S'] },
  ];
  assert.deepEqual(filterProducts(products, { category: 'A', size: 'S' }).map((p) => p.id), [1]);
  assert.equal(filterProducts(products).length, 3);
});

test('bag groups the same product, size and color', () => {
  const product = { id: 'top-1', name: 'Top', price: 1000 };
  let bag = addToBag([], product, { size: 'M', color: 'negro' });
  bag = addToBag(bag, product, { size: 'M', color: 'negro' });
  bag = addToBag(bag, product, { size: 'L', color: 'negro' });
  assert.equal(bag.length, 2);
  assert.equal(bagCount(bag), 3);
  assert.equal(bagTotal(bag), 3000);
});

test('changeQty removes items that reach zero', () => {
  const bag = addToBag([], { id: 'x', name: 'X', price: 10 });
  assert.deepEqual(changeQty(bag, bag[0].key, -1), []);
  assert.equal(changeQty(bag, bag[0].key, 2)[0].qty, 3);
});

test('whatsappLink builds an encoded order message', () => {
  const bag = addToBag([], { id: 'c', name: 'Conjunto', price: 24500 }, { size: 'M', color: 'negro' });
  const url = whatsappLink('+54 9 11 2345-6789', bag, 'Mi Tienda');
  assert.ok(url.startsWith('https://wa.me/5491123456789?text='));
  const text = decodeURIComponent(url.split('text=')[1]);
  assert.match(text, /Mi Tienda/);
  assert.match(text, /1 x Conjunto \(talle M, negro\)/);
  assert.match(text, /Total: \$\s?24\.500/);
});

test('slugify and colorHex', () => {
  assert.equal(slugify('Corpiño Soft sin aro!'), 'corpino-soft-sin-aro');
  assert.equal(colorHex('Bordó'), '#6d1a2e');
  assert.equal(colorHex('fucsia raro'), '#c9bfc4');
});
