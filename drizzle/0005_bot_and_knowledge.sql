-- manual: drizzle-kit does not emit extensions. `vector(768)` and the HNSW index below need it.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "app_bot_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'inactive' NOT NULL,
	"assistant_name" varchar(100) DEFAULT 'Asistente' NOT NULL,
	"persona_prompt" text,
	"payment_instructions" text,
	"locale" varchar(10) DEFAULT 'es' NOT NULL,
	"chat_model" varchar(60) DEFAULT 'gemini-flash-latest' NOT NULL,
	"embedding_model" varchar(60) DEFAULT 'gemini-embedding-001' NOT NULL,
	"embedding_dimensions" smallint DEFAULT 768 NOT NULL,
	"temperature" numeric(3, 2) DEFAULT '0.20' NOT NULL,
	"max_tool_iterations" smallint DEFAULT 6 NOT NULL,
	"retrieval_top_k" smallint DEFAULT 5 NOT NULL,
	"retrieval_min_score" numeric(4, 3) DEFAULT '0.650' NOT NULL,
	"history_window" smallint DEFAULT 20 NOT NULL,
	"handoff_enabled" boolean DEFAULT true NOT NULL,
	"handoff_minutes" integer DEFAULT 60 NOT NULL,
	"auto_create_client" boolean DEFAULT true NOT NULL,
	"auto_create_sale" boolean DEFAULT true NOT NULL,
	"contact_daily_message_limit" integer DEFAULT 200 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_bot_settings_status_check" CHECK ("app_bot_settings"."status" in ('active', 'inactive')),
	CONSTRAINT "app_bot_settings_temperature_check" CHECK ("app_bot_settings"."temperature" >= 0 and "app_bot_settings"."temperature" <= 2),
	CONSTRAINT "app_bot_settings_max_tool_iterations_check" CHECK ("app_bot_settings"."max_tool_iterations" between 1 and 12),
	CONSTRAINT "app_bot_settings_retrieval_top_k_check" CHECK ("app_bot_settings"."retrieval_top_k" between 1 and 20),
	CONSTRAINT "app_bot_settings_retrieval_min_score_check" CHECK ("app_bot_settings"."retrieval_min_score" >= 0 and "app_bot_settings"."retrieval_min_score" <= 1),
	CONSTRAINT "app_bot_settings_history_window_check" CHECK ("app_bot_settings"."history_window" between 2 and 100)
);
--> statement-breakpoint
CREATE TABLE "app_bot_channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"app_secret_encrypted" text,
	"verify_token_encrypted" text,
	"webhook_secret_encrypted" text,
	"graph_api_version" varchar(10) DEFAULT 'v21.0' NOT NULL,
	"waba_id" varchar(64),
	"status" varchar(20) DEFAULT 'inactive' NOT NULL,
	"last_event_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_bot_channels_provider_check" CHECK ("app_bot_channels"."provider" in ('whatsapp', 'telegram')),
	CONSTRAINT "app_bot_channels_status_check" CHECK ("app_bot_channels"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "app_bot_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"external_event_id" varchar(128) NOT NULL,
	"contact_external_id" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"max_attempts" smallint DEFAULT 5 NOT NULL,
	"last_error" text,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(64),
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_bot_events_status_check" CHECK ("app_bot_events"."status" in ('pending', 'processing', 'completed', 'failed', 'dlq', 'discarded')),
	CONSTRAINT "app_bot_events_attempts_check" CHECK ("app_bot_events"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_bot_contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"phone_e164" varchar(20),
	"display_name" varchar(150),
	"client_id" uuid,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"blocked_reason" varchar(255),
	"blocked_at" timestamp with time zone,
	"blocked_by" uuid,
	"last_inbound_at" timestamp with time zone,
	"last_outbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_bot_contacts_status_check" CHECK ("app_bot_contacts"."status" in ('active', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "app_bot_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"handled_by" varchar(10) DEFAULT 'bot' NOT NULL,
	"assigned_user_id" uuid,
	"handoff_reason" varchar(255),
	"handoff_at" timestamp with time zone,
	"handoff_expires_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"last_inbound_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_bot_conversations_status_check" CHECK ("app_bot_conversations"."status" in ('open', 'closed')),
	CONSTRAINT "app_bot_conversations_handled_by_check" CHECK ("app_bot_conversations"."handled_by" in ('bot', 'human'))
);
--> statement-breakpoint
CREATE TABLE "app_bot_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"event_id" uuid,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"tool_name" varchar(60),
	"tool_args" jsonb,
	"tool_result" jsonb,
	"external_message_id" varchar(128),
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"error" text,
	"author_user_id" uuid,
	"token_usage" jsonb,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_bot_messages_role_check" CHECK ("app_bot_messages"."role" in ('user', 'assistant', 'tool', 'agent')),
	CONSTRAINT "app_bot_messages_status_check" CHECK ("app_bot_messages"."status" in ('queued', 'sent', 'delivered', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "app_knowledge_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_estimate" integer,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_knowledge_chunks_chunk_index_check" CHECK ("app_knowledge_chunks"."chunk_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_knowledge_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"title" varchar(200) NOT NULL,
	"source_type" varchar(20) DEFAULT 'manual' NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"ingest_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ingest_error" text,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"indexed_at" timestamp with time zone,
	"embedding_model" varchar(60),
	"embedding_dimensions" smallint,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "app_knowledge_documents_status_check" CHECK ("app_knowledge_documents"."status" in ('active', 'inactive')),
	CONSTRAINT "app_knowledge_documents_ingest_status_check" CHECK ("app_knowledge_documents"."ingest_status" in ('pending', 'processing', 'indexed', 'failed')),
	CONSTRAINT "app_knowledge_documents_source_type_check" CHECK ("app_knowledge_documents"."source_type" in ('manual', 'upload'))
);
--> statement-breakpoint
ALTER TABLE "app_clients" ADD COLUMN "phone_e164" varchar(20);--> statement-breakpoint
ALTER TABLE "app_bot_settings" ADD CONSTRAINT "app_bot_settings_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_settings" ADD CONSTRAINT "app_bot_settings_agent_user_id_users_id_fk" FOREIGN KEY ("agent_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_channels" ADD CONSTRAINT "app_bot_channels_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_events" ADD CONSTRAINT "app_bot_events_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_events" ADD CONSTRAINT "app_bot_events_channel_id_app_bot_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."app_bot_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_contacts" ADD CONSTRAINT "app_bot_contacts_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_contacts" ADD CONSTRAINT "app_bot_contacts_channel_id_app_bot_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."app_bot_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_contacts" ADD CONSTRAINT "app_bot_contacts_client_id_app_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."app_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_contacts" ADD CONSTRAINT "app_bot_contacts_blocked_by_users_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_conversations" ADD CONSTRAINT "app_bot_conversations_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_conversations" ADD CONSTRAINT "app_bot_conversations_contact_id_app_bot_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."app_bot_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_conversations" ADD CONSTRAINT "app_bot_conversations_channel_id_app_bot_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."app_bot_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_conversations" ADD CONSTRAINT "app_bot_conversations_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_messages" ADD CONSTRAINT "app_bot_messages_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_messages" ADD CONSTRAINT "app_bot_messages_conversation_id_app_bot_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."app_bot_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_messages" ADD CONSTRAINT "app_bot_messages_event_id_app_bot_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."app_bot_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_bot_messages" ADD CONSTRAINT "app_bot_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_knowledge_chunks" ADD CONSTRAINT "app_knowledge_chunks_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_knowledge_chunks" ADD CONSTRAINT "app_knowledge_chunks_document_id_app_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."app_knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_knowledge_documents" ADD CONSTRAINT "app_knowledge_documents_company_id_app_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."app_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_knowledge_documents" ADD CONSTRAINT "app_knowledge_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_settings_company_id_unique" ON "app_bot_settings" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_channels_provider_external_id_unique" ON "app_bot_channels" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "app_bot_channels_company_id_provider_idx" ON "app_bot_channels" USING btree ("company_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_events_provider_external_event_id_unique" ON "app_bot_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE INDEX "app_bot_events_status_available_at_idx" ON "app_bot_events" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "app_bot_events_company_id_created_at_idx" ON "app_bot_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_contacts_channel_id_external_id_unique" ON "app_bot_contacts" USING btree ("channel_id","external_id");--> statement-breakpoint
CREATE INDEX "app_bot_contacts_company_id_phone_e164_idx" ON "app_bot_contacts" USING btree ("company_id","phone_e164");--> statement-breakpoint
CREATE INDEX "app_bot_contacts_client_id_idx" ON "app_bot_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_conversations_company_id_code_unique" ON "app_bot_conversations" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_conversations_contact_id_open_unique" ON "app_bot_conversations" USING btree ("contact_id") WHERE "app_bot_conversations"."status" = 'open';--> statement-breakpoint
CREATE INDEX "app_bot_conversations_company_id_status_last_message_at_idx" ON "app_bot_conversations" USING btree ("company_id","status","last_message_at");--> statement-breakpoint
CREATE INDEX "app_bot_messages_conversation_id_created_at_idx" ON "app_bot_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_bot_messages_company_id_external_message_id_unique" ON "app_bot_messages" USING btree ("company_id","external_message_id");--> statement-breakpoint
CREATE INDEX "app_bot_messages_event_id_idx" ON "app_bot_messages" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_knowledge_chunks_document_id_chunk_index_unique" ON "app_knowledge_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "app_knowledge_chunks_company_id_idx" ON "app_knowledge_chunks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "app_knowledge_chunks_embedding_hnsw_idx" ON "app_knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "app_knowledge_documents_company_id_code_unique" ON "app_knowledge_documents" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "app_knowledge_documents_company_id_status_idx" ON "app_knowledge_documents" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "app_knowledge_documents_ingest_status_idx" ON "app_knowledge_documents" USING btree ("ingest_status");--> statement-breakpoint
CREATE INDEX "app_clients_company_id_phone_e164_idx" ON "app_clients" USING btree ("company_id","phone_e164");