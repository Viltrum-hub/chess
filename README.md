# Nocturne Chess Club

Ajedrez contra IA con cuatro dificultades y ocho colecciones: Heritage, Monolith, Type Club, Neon District, Orbit, Shogun, Amethyst Royale y Midnight Coven (Halloween).

## Ejecutar

Sirve la carpeta con un servidor HTTP, por ejemplo `python -m http.server 8080`, y abre `http://localhost:8080`.

La skin se aplica a tu ejército y el rival conserva su propio diseño. Tablero combinable, sonido por evento, enroque, captura al paso y coronación. La partida y los ajustes se guardan en el navegador.

## Inventario por cuenta

El esquema de Supabase está preparado en `database/schema.sql`. **Todavía no está conectado**: Supabase bloqueó la creación del proyecto por el límite de dos proyectos gratuitos. Hasta conectar cuentas e inventario, la web permite probar todas las skins con guardado local. Consulta `database/README.md`.

## Motor y recursos

Reglas: chess.js (licencia BSD-2-Clause incluida). Rival: búsqueda negamax con poda alfa-beta en un Web Worker. Las colecciones Amethyst Royale y Midnight Coven usan atlas de piezas transparentes renderizadas en 3D.
