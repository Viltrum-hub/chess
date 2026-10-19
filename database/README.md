# Base de datos de Nocturne

El sitio usa Cloudflare D1 con la vinculación DB. El esquema activo está en `db/schema.ts` y las migraciones en `drizzle/`.

La identidad se obtiene del inicio de sesión del alojamiento. El servidor deriva el usuario de la sesión; no acepta identificadores ni roles enviados por el navegador. La cuenta creadora se configura con la variable privada CHESS_OWNER_EMAIL y recibe las ocho skins. Cada cuenta guarda inventario y preferencias por su identificador estable. Los conflictos entre dispositivos se controlan con revisiones.

Para verificar: `node tests/inventory.mjs`. No hay claves de Supabase ni un proyecto adicional.
