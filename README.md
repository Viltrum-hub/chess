# Nocturne Chess Club

Ajedrez contra IA con cuatro dificultades y seis colecciones de skins: Heritage, Monolith, Type Club, Neon District, Orbit y Shogun. Tableros y piezas combinables, diseño adaptable y guardado local.

## Ejecutar

Sirve esta carpeta con un servidor HTTP, por ejemplo `python -m http.server 8080`, y abre `http://localhost:8080`.

No requiere claves ni servicios externos. La partida y personalización se guardan en el navegador.

## Motor

Reglas: chess.js (licencia BSD-2-Clause incluida). Rival: búsqueda negamax con poda alfa-beta en un Web Worker.
