CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`pages` integer NOT NULL,
	`characters_per_page` integer NOT NULL,
	`time_limit` text NOT NULL,
	`time_limit_seconds` integer,
	`created_at` integer NOT NULL
);
