# Inventario de Nocturne

Estado: esquema preparado; no se ha creado ni conectado una base de datos. La cuenta Supabase ha alcanzado su límite de dos proyectos gratuitos. La web funciona por ahora como vista de prueba con todas las skins disponibles y guardado local, sin restricción por cuenta.

Aplicar `schema.sql` únicamente en un proyecto dedicado de ajedrez. Después conectar Supabase Auth y el cliente de inventario con la URL del proyecto y su clave publicable. Nunca enviar claves secretas al navegador.

## Acceso por jugador

- `chess_skin_catalog`: catálogo público.
- `chess_player_inventory`: derechos por usuario; solo el servidor puede asignarlos.
- `chess_club_owners`: propietarios con acceso a toda la colección; no se puede editar desde el cliente.
- `chess_player_preferences`: skin, tablero y sonido de cada cuenta. Las políticas comprueban identidad y derecho a equipar la skin.

Tras crear y verificar la cuenta propietaria, usar su UUID real de Auth para asignar propietario con SQL de administración. No dar el rol al primer visitante ni confiar en metadatos editables del usuario.

```sql
-- Sustituir el UUID por el usuario verificado en auth.users.
insert into public.chess_club_owners(user_id) values ('UUID_DEL_PROPIETARIO');
```

La partida actual es contra IA. Cada ejército usa su propio diseño; esto no añade multijugador.
