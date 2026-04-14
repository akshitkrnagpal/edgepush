-- Rollback for 0002_heavy_hulk.sql
-- Apply via: wrangler d1 execute edgepush --file drizzle-rollback/0002_heavy_hulk.sql
--
-- Reverses the additive v1 foundation migration: drops the 4 new tables,
-- removes the 8 probe columns from credential tables, and drops the 2 new
-- composite indexes on messages. This is a destructive operation — any data
-- written to subscriptions / usage_counters / stripe_events / worker_errors
-- will be lost, and any probe health state on credentials will be wiped.

DROP INDEX IF EXISTS `messages_by_app_status_created`;
DROP INDEX IF EXISTS `messages_by_app_created`;

ALTER TABLE `fcm_credentials` DROP COLUMN `alert_sent_at`;
ALTER TABLE `fcm_credentials` DROP COLUMN `last_check_error`;
ALTER TABLE `fcm_credentials` DROP COLUMN `last_check_ok`;
ALTER TABLE `fcm_credentials` DROP COLUMN `last_checked_at`;

ALTER TABLE `apns_credentials` DROP COLUMN `alert_sent_at`;
ALTER TABLE `apns_credentials` DROP COLUMN `last_check_error`;
ALTER TABLE `apns_credentials` DROP COLUMN `last_check_ok`;
ALTER TABLE `apns_credentials` DROP COLUMN `last_checked_at`;

DROP INDEX IF EXISTS `worker_errors_by_kind_created`;
DROP INDEX IF EXISTS `worker_errors_by_created`;
DROP TABLE IF EXISTS `worker_errors`;

DROP INDEX IF EXISTS `usage_counters_pk`;
DROP TABLE IF EXISTS `usage_counters`;

DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `stripe_events`;
