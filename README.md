# Tienda – catálogo con Google Sheets

![Tests](https://github.com/Drabenq/tienda-ropa-interior/actions/workflows/test.yml/badge.svg)

**Demo:** https://drabenq.github.io/tienda-ropa-interior/

Online catalog for a small lingerie business. Products are managed from a **Google Sheet**, so someone who does not code can add items, change prices or mark items out of stock, and the site updates on reload. Orders are sent as a pre-filled **WhatsApp** message. No backend, no database, no monthly fees: it runs on GitHub Pages.

## Features

- Catalog loaded from a published Google Sheets CSV (falls back to `data/productos.csv`)
- Category and size filters
- Color and size selection per product, out-of-stock state
- Order bag saved on the device, with quantities and total
- "Send order" builds a WhatsApp message with every item, size, color and the total
- Products without photos show their colors as a placeholder

## Managing products

Create a sheet with these columns:

| nombre | categoria | precio | talles | colores | imagen | descripcion | disponible |
|--------|-----------|--------|--------|---------|--------|-------------|------------|
| Conjunto Encaje | Conjuntos | 24.500 | S\|M\|L | negro\|bordo | (image URL) | Short text | si |

Then **File > Share > Publish to web > CSV**, and paste the link in `sheetCsvUrl` in `src/config.js`, along with the store name and WhatsApp number. Prices accept Argentine formats (`24.500`, `$ 24.500,50`).

## Tech

Vanilla JavaScript (ES modules), no dependencies. CSV parsing, price parsing, filters, bag logic and WhatsApp link generation are pure functions in `src/logic.js`, covered by 13 unit tests:

```bash
npm test
```

## Run locally

```bash
python -m http.server 8000
```

Open http://localhost:8000
