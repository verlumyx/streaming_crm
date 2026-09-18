ALTER TABLE "app_bot_settings" ADD COLUMN "exchange_rate" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "app_bot_settings" ADD COLUMN "exchange_rate_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_bot_settings" ADD CONSTRAINT "app_bot_settings_exchange_rate_check" CHECK ("app_bot_settings"."exchange_rate" is null or "app_bot_settings"."exchange_rate" > 0);