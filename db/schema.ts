import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const players = sqliteTable('chess_players', {
  userId: text('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  isOwner: integer('is_owner', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
export const skins = sqliteTable('chess_skins', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  boardTheme: integer('board_theme').notNull(),
  assetPath: text('asset_path'),
  isFree: integer('is_free', { mode: 'boolean' }).notNull().default(false),
});
export const inventory = sqliteTable('chess_inventory', {
  userId: text('user_id').notNull().references(() => players.userId),
  skinId: text('skin_id').notNull().references(() => skins.id),
  grantedAt: text('granted_at').notNull(),
}, table => [primaryKey({ columns: [table.userId, table.skinId] })]);
export const preferences = sqliteTable('chess_preferences', {
  userId: text('user_id').primaryKey().references(() => players.userId),
  stateJson: text('state_json').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
