ALTER TABLE "app_sales" DROP CONSTRAINT "app_sales_status_check";--> statement-breakpoint
ALTER TABLE "app_sales" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "app_sales" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_sales" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "app_sales" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_sales" ADD COLUMN "rejected_by" uuid;--> statement-breakpoint
ALTER TABLE "app_sales" ADD COLUMN "rejection_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_status_check" CHECK ("app_sales"."status" in ('pending', 'active', 'expired', 'cancelled', 'rejected'));