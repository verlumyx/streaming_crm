-- Best-effort E.164 for clients created before the column existed, so an inbound WhatsApp/Telegram
-- contact can be matched to them. `joinPhone` always stores the `+<dial> <number>` form, so the
-- leading `+` is the reliable signal; anything else is assumed local, loses its national trunk
-- prefix (`0412…`) and gets the default dial code. Mirrors `toE164` in src/lib/phone.ts.
UPDATE "app_clients"
SET "phone_e164" = CASE
  WHEN "phone" LIKE '+%' THEN '+' || regexp_replace("phone", '[^0-9]', '', 'g')
  ELSE '+58' || regexp_replace(regexp_replace("phone", '[^0-9]', '', 'g'), '^0+', '')
END
WHERE "phone_e164" IS NULL
  AND "phone" IS NOT NULL
  AND length(regexp_replace("phone", '[^0-9]', '', 'g')) >= 8;
