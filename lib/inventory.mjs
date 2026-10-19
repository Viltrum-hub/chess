import {Chess} from '../public/chess.js';
export const catalog = [
  ['classic','Heritage',1,null,1],['modern','Monolith',3,null,0],
  ['mono','Type Club',0,null,0],['cyber','Neon District',4,null,0],
  ['cosmic','Orbit',2,null,0],['samurai','Shogun',5,null,0],
  ['amethyst','Amethyst Royale',6,'assets/amethyst-atlas.webp',0],
  ['halloween','Midnight Coven',7,'assets/halloween-atlas.webp',0],
];
export class InventoryError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export async function ensureCatalog(db){
  await db.batch(catalog.map(s=>db.prepare('INSERT OR IGNORE INTO chess_skins(id,title,board_theme,asset_path,is_free) VALUES (?,?,?,?,?)').bind(...s)));
}
export async function loadProfile(db,user,ownerEmail){
  if(!user?.userId)throw new InventoryError('Inicia sesión para abrir tu colección.',401);
  await ensureCatalog(db);
  const now=new Date().toISOString();
  const owner=!!ownerEmail&&user.email.toLowerCase()===ownerEmail.toLowerCase();
  await db.prepare('INSERT INTO chess_players(user_id,display_name,is_owner,created_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name').bind(user.userId,user.displayName,owner?1:0,now).run();
  if(owner)await db.prepare('UPDATE chess_players SET is_owner=1 WHERE user_id=?').bind(user.userId).run();
  const profile=await db.prepare('SELECT user_id,display_name,is_owner FROM chess_players WHERE user_id=?').bind(user.userId).first();
  await db.prepare('INSERT OR IGNORE INTO chess_inventory(user_id,skin_id,granted_at) SELECT ?,id,? FROM chess_skins WHERE is_free=1 OR ?=1').bind(user.userId,now,profile.is_owner).run();
  const rows=await db.prepare('SELECT skin_id,granted_at FROM chess_inventory WHERE user_id=?').bind(user.userId).all();
  const pref=await db.prepare('SELECT state_json,revision,updated_at FROM chess_preferences WHERE user_id=?').bind(user.userId).first();
  return {user:{id:profile.user_id,name:profile.display_name,isOwner:!!profile.is_owner},inventory:rows.results.map(r=>r.skin_id),catalog:catalog.map(s=>({id:s[0],title:s[1],boardTheme:s[2]})),preferences:pref?JSON.parse(pref.state_json):null,revision:pref?.revision??0,updatedAt:pref?.updated_at??null};
}
export async function saveProfile(db,user,ownerEmail,payload){
  const account=await loadProfile(db,user,ownerEmail);
  const s=payload?.state;
  if(!s||typeof s!=='object')throw new InventoryError('La configuración no es válida.');
  if(!account.inventory.includes(s.pieceStyle))throw new InventoryError('Esta skin no pertenece a tu colección.',403);
  const themes=new Set([0,1,...account.catalog.filter(c=>account.inventory.includes(c.id)).map(c=>c.boardTheme)]);
  if(!Number.isInteger(s.theme)||!themes.has(s.theme))throw new InventoryError('El tablero no está disponible en tu colección.',403);
  if(!['w','b'].includes(s.human)||!Number.isInteger(s.level)||s.level<0||s.level>3||typeof s.sound!=='boolean'||typeof s.pgn!=='string'||s.pgn.length>30000)throw new InventoryError('Los ajustes de la partida no son válidos.');
  try{const game=new Chess();if(s.pgn)game.loadPgn(s.pgn);}catch{throw new InventoryError('La partida no contiene movimientos válidos.');}
  const state={pgn:s.pgn,level:s.level,human:s.human,theme:s.theme,pieceStyle:s.pieceStyle,opponentStyle:'amethyst',sound:s.sound};
  const revision=payload.revision;
  if(!Number.isInteger(revision)||revision<0)throw new InventoryError('La revisión no es válida.');
  const now=new Date().toISOString();
  const result=await db.prepare('INSERT INTO chess_preferences(user_id,state_json,revision,updated_at) SELECT ?,?,1,? WHERE ?=0 ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json, revision=chess_preferences.revision+1, updated_at=excluded.updated_at WHERE chess_preferences.revision=?').bind(user.userId,JSON.stringify(state),now,revision,revision).run();
  // Existing rows require an update even when the insert guard is false.
  let changes=result.meta?.changes??0;
  if(!changes&&revision>0){const updated=await db.prepare('UPDATE chess_preferences SET state_json=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(JSON.stringify(state),now,user.userId,revision).run();changes=updated.meta?.changes??0;}
  if(!changes)throw new InventoryError('La partida cambió en otro dispositivo. Recarga para sincronizar.',409);
  const row=await db.prepare('SELECT revision FROM chess_preferences WHERE user_id=?').bind(user.userId).first();
  return {saved:true,revision:row.revision,updatedAt:now};
}
