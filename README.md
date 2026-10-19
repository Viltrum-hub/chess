# Nocturne Chess Club

Ajedrez contra IA con cuatro niveles y ocho colecciones de skins, incluyendo Amethyst Royale y Halloween: Midnight Coven.

## Cuenta e inventario

La versión con base de datos está en https://nocturne-chess.viltrum2026.chatgpt.site. Usa el inicio de sesión del alojamiento y una base D1 exclusiva. Guarda inventario, skin equipada, tablero, partida, nivel y sonido entre dispositivos. La cuenta creadora tiene las ocho colecciones; otras cuentas reciben la clásica y solo pueden equipar skins asignadas.

GitHub Pages ejecuta el juego directamente en modo local, sin redirecciones. La partida y personalización se guardan en el navegador. La sincronización por cuenta usa la versión con servidor; no se simula una conexión de base de datos en GitHub Pages. Los archivos visuales están en `public/` y la lógica del servidor en `app/api/` y `lib/`.

## Desarrollo

Instalar con el gestor indicado por package.json; ejecutar `npm run dev`. El alojamiento configura DB y CHESS_OWNER_EMAIL. Nunca escribir el valor privado de esa variable en el repositorio. Ver `database/README.md`.

## Verificación

`node tests/inventory.mjs` comprueba inventarios, permisos, restauración y conflictos. `npm run build` compila el sitio.

## Motor

chess.js para reglas (licencia incluida); negamax con poda alfa-beta en un Web Worker para la IA.
