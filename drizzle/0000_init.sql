CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"is_system_owner" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_companies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"address" varchar(500),
	"description" text,
	"phone" varchar(20),
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_company" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"role_id" uuid,
	"status" varchar(55) DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"permission" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"name" varchar(255) NOT NULL,
	"status" varchar(55) DEFAULT 'active' NOT NULL,
	"description" text,
	"permission_type" varchar(10) DEFAULT 'custom' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_modules_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "app_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_menus" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_id" uuid,
	"title" varchar(100) NOT NULL,
	"url" varchar(255),
	"permission" varchar(100),
	"icon" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"section" varchar(20) DEFAULT 'main' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"name" varchar(150) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"name" varchar(100) NOT NULL,
	"logo_url" varchar(255),
	"max_profiles" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_services_max_profiles_check" CHECK ("app_services"."max_profiles" >= 1)
);
--> statement-breakpoint
CREATE TABLE "app_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"service_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"capacity" varchar(20) NOT NULL,
	"duration_days" integer NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"roi_target_pct" numeric(5, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_plans_capacity_check" CHECK ("app_plans"."capacity" in ('profile', 'full_account')),
	CONSTRAINT "app_plans_duration_days_check" CHECK ("app_plans"."duration_days" >= 1),
	CONSTRAINT "app_plans_sale_price_check" CHECK ("app_plans"."sale_price" >= 0),
	CONSTRAINT "app_plans_roi_target_pct_check" CHECK ("app_plans"."roi_target_pct" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_account_renewals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"type" varchar(20) DEFAULT 'renewal' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"paid_at" date NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_account_renewals_amount_check" CHECK ("app_account_renewals"."amount" >= 0),
	CONSTRAINT "app_account_renewals_period_check" CHECK ("app_account_renewals"."period_end" >= "app_account_renewals"."period_start"),
	CONSTRAINT "app_account_renewals_type_check" CHECK ("app_account_renewals"."type" in ('purchase', 'renewal'))
);
--> statement-breakpoint
CREATE TABLE "app_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"service_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_encrypted" text NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"purchase_date" date NOT NULL,
	"next_renewal" date NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_accounts_cost_check" CHECK ("app_accounts"."cost" >= 0),
	CONSTRAINT "app_accounts_status_check" CHECK ("app_accounts"."status" in ('active', 'down', 'maintenance', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "app_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"number" smallint NOT NULL,
	"pin" varchar(10),
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_profiles_number_check" CHECK ("app_profiles"."number" >= 1),
	CONSTRAINT "app_profiles_status_check" CHECK ("app_profiles"."status" in ('available', 'occupied', 'maintenance'))
);
--> statement-breakpoint
CREATE TABLE "app_sale_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_sale_renewals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"renewed_at" date NOT NULL,
	"previous_end_date" date NOT NULL,
	"new_end_date" date NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"renewed_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_sale_renewals_duration_days_check" CHECK ("app_sale_renewals"."duration_days" >= 1),
	CONSTRAINT "app_sale_renewals_price_check" CHECK ("app_sale_renewals"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"client_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"capacity" varchar(20) NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" varchar(255),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_sales_capacity_check" CHECK ("app_sales"."capacity" in ('profile', 'full_account')),
	CONSTRAINT "app_sales_duration_days_check" CHECK ("app_sales"."duration_days" >= 1),
	CONSTRAINT "app_sales_price_check" CHECK ("app_sales"."price" >= 0),
	CONSTRAINT "app_sales_status_check" CHECK ("app_sales"."status" in ('active', 'expired', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "app_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"type" varchar(10) NOT NULL,
	"category" varchar(50) NOT NULL,
	"subcategory" varchar(100),
	"related_type" varchar(50),
	"related_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"date" date NOT NULL,
	"payment_method" varchar(100) NOT NULL,
	"reference" varchar(100),
	"period_from" date,
	"period_to" date,
	"description" varchar(255) NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"receipt_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_transactions_type_check" CHECK ("app_transactions"."type" in ('income', 'expense')),
	CONSTRAINT "app_transactions_category_check" CHECK ("app_transactions"."category" in ('sale', 'renewal', 'partner_contribution', 'other_income', 'streaming_account', 'streaming_account_renewal', 'petty_cash', 'salary', 'commission', 'utilities', 'tools', 'marketing', 'refund', 'other_expense')),
	CONSTRAINT "app_transactions_amount_check" CHECK ("app_transactions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"sale_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_by" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_refunds_amount_check" CHECK ("app_refunds"."amount" >= 0),
	CONSTRAINT "app_refunds_status_check" CHECK ("app_refunds"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "app_manual_transaction_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"manual_transaction_id" uuid NOT NULL,
	"type" varchar(10) NOT NULL,
	"category" varchar(40) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_manual_transaction_lines_type_check" CHECK ("app_manual_transaction_lines"."type" in ('income', 'expense')),
	CONSTRAINT "app_manual_transaction_lines_amount_check" CHECK ("app_manual_transaction_lines"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_manual_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"date" date NOT NULL,
	"payment_method" varchar(30) NOT NULL,
	"reference" varchar(100),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"description" text,
	"notes" text,
	"recorded_by" uuid,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_manual_transactions_total_check" CHECK ("app_manual_transactions"."total" >= 0),
	CONSTRAINT "app_manual_transactions_status_check" CHECK ("app_manual_transactions"."status" in ('pending', 'approved', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "app_leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "app_leads_status_check" CHECK ("app_leads"."status" in ('pending', 'reviewed'))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company" ADD CONSTRAINT "user_company_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company" ADD CONSTRAINT "user_company_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company" ADD CONSTRAINT "user_company_role_id_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_role_permissions" ADD CONSTRAINT "app_role_permissions_role_id_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_roles" ADD CONSTRAINT "app_roles_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_permissions" ADD CONSTRAINT "app_permissions_module_id_app_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."app_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_menus" ADD CONSTRAINT "app_menus_parent_id_app_menus_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."app_menus"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_clients" ADD CONSTRAINT "app_clients_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_clients" ADD CONSTRAINT "app_clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_services" ADD CONSTRAINT "app_services_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_plans" ADD CONSTRAINT "app_plans_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_plans" ADD CONSTRAINT "app_plans_service_id_app_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."app_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_account_renewals" ADD CONSTRAINT "app_account_renewals_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_account_renewals" ADD CONSTRAINT "app_account_renewals_account_id_app_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."app_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_account_renewals" ADD CONSTRAINT "app_account_renewals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_accounts" ADD CONSTRAINT "app_accounts_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_accounts" ADD CONSTRAINT "app_accounts_service_id_app_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."app_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_profiles" ADD CONSTRAINT "app_profiles_account_id_app_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."app_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sale_profiles" ADD CONSTRAINT "app_sale_profiles_sale_id_app_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."app_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sale_profiles" ADD CONSTRAINT "app_sale_profiles_profile_id_app_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."app_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sale_renewals" ADD CONSTRAINT "app_sale_renewals_sale_id_app_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."app_sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sale_renewals" ADD CONSTRAINT "app_sale_renewals_renewed_by_users_id_fk" FOREIGN KEY ("renewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_client_id_app_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."app_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_plan_id_app_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."app_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sales" ADD CONSTRAINT "app_sales_service_id_app_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."app_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_transactions" ADD CONSTRAINT "app_transactions_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_transactions" ADD CONSTRAINT "app_transactions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_refunds" ADD CONSTRAINT "app_refunds_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_refunds" ADD CONSTRAINT "app_refunds_sale_id_app_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."app_sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_refunds" ADD CONSTRAINT "app_refunds_client_id_app_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."app_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_refunds" ADD CONSTRAINT "app_refunds_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_refunds" ADD CONSTRAINT "app_refunds_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_manual_transaction_lines" ADD CONSTRAINT "app_manual_transaction_lines_manual_transaction_id_app_manual_transactions_id_fk" FOREIGN KEY ("manual_transaction_id") REFERENCES "public"."app_manual_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_manual_transactions" ADD CONSTRAINT "app_manual_transactions_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_manual_transactions" ADD CONSTRAINT "app_manual_transactions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factors_user_id_idx" ON "two_factors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "app_companies_status_idx" ON "app_companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_companies_created_by_idx" ON "app_companies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "app_companies_created_at_idx" ON "app_companies" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_company_user_id_company_id_unique" ON "user_company" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "user_company_status_idx" ON "user_company" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_company_company_id_idx" ON "user_company" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_role_permissions_role_id_permission_unique" ON "app_role_permissions" USING btree ("role_id","permission");--> statement-breakpoint
CREATE INDEX "app_role_permissions_permission_idx" ON "app_role_permissions" USING btree ("permission");--> statement-breakpoint
CREATE UNIQUE INDEX "app_roles_name_company_id_unique" ON "app_roles" USING btree ("name","company_id");--> statement-breakpoint
CREATE INDEX "app_roles_status_idx" ON "app_roles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_roles_company_id_idx" ON "app_roles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "app_modules_is_active_idx" ON "app_modules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "app_modules_order_idx" ON "app_modules" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "app_permissions_module_id_action_unique" ON "app_permissions" USING btree ("module_id","action");--> statement-breakpoint
CREATE INDEX "app_permissions_action_idx" ON "app_permissions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "app_permissions_is_active_idx" ON "app_permissions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "app_menus_parent_id_idx" ON "app_menus" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "app_menus_section_idx" ON "app_menus" USING btree ("section");--> statement-breakpoint
CREATE INDEX "app_menus_is_active_idx" ON "app_menus" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "app_menus_order_idx" ON "app_menus" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "app_clients_company_id_code_unique" ON "app_clients" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_clients_company_id_email_unique" ON "app_clients" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "app_clients_name_idx" ON "app_clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "app_clients_status_idx" ON "app_clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_clients_created_at_idx" ON "app_clients" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_services_company_id_code_unique" ON "app_services" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_services_company_id_name_unique" ON "app_services" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "app_services_active_idx" ON "app_services" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "app_plans_company_id_code_unique" ON "app_plans" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "app_plans_service_id_idx" ON "app_plans" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "app_plans_name_idx" ON "app_plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "app_plans_active_idx" ON "app_plans" USING btree ("active");--> statement-breakpoint
CREATE INDEX "app_account_renewals_account_id_created_at_idx" ON "app_account_renewals" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "app_account_renewals_period_end_idx" ON "app_account_renewals" USING btree ("period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "app_accounts_company_id_code_unique" ON "app_accounts" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_accounts_service_id_email_unique" ON "app_accounts" USING btree ("service_id","email");--> statement-breakpoint
CREATE INDEX "app_accounts_status_idx" ON "app_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_accounts_created_at_idx" ON "app_accounts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_profiles_account_id_number_unique" ON "app_profiles" USING btree ("account_id","number");--> statement-breakpoint
CREATE INDEX "app_profiles_status_idx" ON "app_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "app_sale_profiles_sale_id_profile_id_unique" ON "app_sale_profiles" USING btree ("sale_id","profile_id");--> statement-breakpoint
CREATE INDEX "app_sale_profiles_profile_id_idx" ON "app_sale_profiles" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "app_sale_renewals_sale_id_idx" ON "app_sale_renewals" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "app_sale_renewals_previous_end_date_idx" ON "app_sale_renewals" USING btree ("previous_end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "app_sales_company_id_code_unique" ON "app_sales" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "app_sales_status_end_date_idx" ON "app_sales" USING btree ("status","end_date");--> statement-breakpoint
CREATE INDEX "app_sales_client_id_idx" ON "app_sales" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "app_sales_agent_id_idx" ON "app_sales" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "app_sales_service_id_idx" ON "app_sales" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "app_transactions_company_id_idx" ON "app_transactions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "app_transactions_date_idx" ON "app_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "app_transactions_type_date_idx" ON "app_transactions" USING btree ("type","date");--> statement-breakpoint
CREATE INDEX "app_transactions_type_category_date_idx" ON "app_transactions" USING btree ("type","category","date");--> statement-breakpoint
CREATE INDEX "app_transactions_related_idx" ON "app_transactions" USING btree ("related_type","related_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_refunds_company_id_code_unique" ON "app_refunds" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "app_refunds_sale_id_idx" ON "app_refunds" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "app_refunds_status_idx" ON "app_refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_refunds_created_at_idx" ON "app_refunds" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_manual_transaction_lines_parent_idx" ON "app_manual_transaction_lines" USING btree ("manual_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_manual_transactions_company_id_code_unique" ON "app_manual_transactions" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "app_manual_transactions_date_idx" ON "app_manual_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "app_manual_transactions_company_status_idx" ON "app_manual_transactions" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "app_leads_status_idx" ON "app_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_leads_created_at_idx" ON "app_leads" USING btree ("created_at");