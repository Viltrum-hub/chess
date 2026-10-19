CREATE TABLE `chess_inventory` (
	`user_id` text NOT NULL,
	`skin_id` text NOT NULL,
	`granted_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `skin_id`),
	FOREIGN KEY (`user_id`) REFERENCES `chess_players`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`skin_id`) REFERENCES `chess_skins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chess_players` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`is_owner` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chess_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `chess_players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chess_skins` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`board_theme` integer NOT NULL,
	`asset_path` text,
	`is_free` integer DEFAULT false NOT NULL
);
