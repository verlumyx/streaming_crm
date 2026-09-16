-- Sales registered before the approval flow were already paid: they count as approved when created.
UPDATE "app_sales" SET "approved_at" = "created_at", "approved_by" = "agent_id" WHERE "approved_at" IS NULL AND "status" <> 'pending';
