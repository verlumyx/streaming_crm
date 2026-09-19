CREATE TABLE "app_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"client_id" uuid NOT NULL,
	"subject" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"channel" varchar(20) DEFAULT 'other' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"reported_by" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_claims_status_check" CHECK ("app_claims"."status" in ('open', 'in_progress', 'resolved', 'closed')),
	CONSTRAINT "app_claims_channel_check" CHECK ("app_claims"."channel" in ('whatsapp', 'phone', 'email', 'in_person', 'bot', 'other'))
);
--> statement-breakpoint
ALTER TABLE "app_claims" ADD CONSTRAINT "app_claims_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_claims" ADD CONSTRAINT "app_claims_client_id_app_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."app_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_claims" ADD CONSTRAINT "app_claims_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_claims" ADD CONSTRAINT "app_claims_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_claims_company_id_code_unique" ON "app_claims" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "app_claims_client_id_idx" ON "app_claims" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "app_claims_status_idx" ON "app_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_claims_created_at_idx" ON "app_claims" USING btree ("created_at");