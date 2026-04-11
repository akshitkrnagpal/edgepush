CREATE TABLE `stripe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`current_period_start` integer,
	`current_period_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`user_id` text NOT NULL,
	`year_month` text NOT NULL,
	`events` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_counters_pk` ON `usage_counters` (`user_id`,`year_month`);--> statement-breakpoint
CREATE TABLE `worker_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `worker_errors_by_created` ON `worker_errors` (`created_at`);--> statement-breakpoint
CREATE INDEX `worker_errors_by_kind_created` ON `worker_errors` (`kind`,`created_at`);--> statement-breakpoint
ALTER TABLE `apns_credentials` ADD `last_checked_at` integer;--> statement-breakpoint
ALTER TABLE `apns_credentials` ADD `last_check_ok` integer;--> statement-breakpoint
ALTER TABLE `apns_credentials` ADD `last_check_error` text;--> statement-breakpoint
ALTER TABLE `apns_credentials` ADD `alert_sent_at` integer;--> statement-breakpoint
ALTER TABLE `fcm_credentials` ADD `last_checked_at` integer;--> statement-breakpoint
ALTER TABLE `fcm_credentials` ADD `last_check_ok` integer;--> statement-breakpoint
ALTER TABLE `fcm_credentials` ADD `last_check_error` text;--> statement-breakpoint
ALTER TABLE `fcm_credentials` ADD `alert_sent_at` integer;--> statement-breakpoint
CREATE INDEX `messages_by_app_created` ON `messages` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_by_app_status_created` ON `messages` (`app_id`,`status`,`created_at`);