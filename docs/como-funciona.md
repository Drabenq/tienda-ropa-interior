# Cómo funciona

## Para quien carga los productos
1. Abrí la planilla de Google Sheets.
2. Cada fila es un producto. Talles y colores se separan con `|` (por ejemplo `S|M|L`).
3. En `disponible` poné `no` para mostrarlo como "Sin stock".
4. Para fotos, pegá en `imagen` el link directo a la foto.
5. Guardá y recargá la página. Puede tardar unos minutos en verse, porque Google actualiza el CSV publicado cada tanto.

## Para explicarlo en una entrevista
- **¿Por qué Google Sheets y no una base de datos?** Para que la dueña lo administre sola, sin panel de administración ni costos. Es la herramienta más simple que resuelve el problema.
- **¿Por qué WhatsApp y no un checkout?** Los negocios chicos venden por WhatsApp: coordinan pago y envío por chat. El sitio arma el mensaje del pedido completo.
- **¿Qué testeaste?** Toda la lógica: el parser de CSV (comas dentro de comillas, saltos de línea, BOM), precios en formato argentino, filtros, el carrito y el link de WhatsApp. También hay un test que valida el CSV de ejemplo.
- **¿Qué mejorarías?** Fotos optimizadas, buscador, y si crece, migrar a una plataforma con pagos online.
