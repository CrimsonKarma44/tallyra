-- Add ledger ownership: NULL means the record belongs to the creator's
-- personal ledger; a value means it belongs to that organization's ledger.
ALTER TABLE "Transaction" ADD COLUMN "ledgerOrgId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "ledgerOrgId" TEXT;

-- Backfill ledger ownership from the creator's current membership so existing
-- visibility is preserved exactly: personal creators keep personal records,
-- org members' records become their organization's.
UPDATE "Transaction"
SET "ledgerOrgId" = (
  SELECT "organizationId" FROM "User" WHERE "User"."id" = "Transaction"."createdById"
);
UPDATE "Expense"
SET "ledgerOrgId" = (
  SELECT "organizationId" FROM "User" WHERE "User"."id" = "Expense"."createdById"
);

-- Mark accounts that were created by an organization admin as sub-accounts.
ALTER TABLE "User" ADD COLUMN "createdByOrgId" TEXT;

-- Backfill: existing members who are not the admin of their organization were
-- added by an admin and therefore count as sub-accounts.
UPDATE "User"
SET "createdByOrgId" = "organizationId"
WHERE "organizationId" IS NOT NULL
  AND "id" != (
    SELECT "adminId" FROM "Organization" WHERE "Organization"."id" = "User"."organizationId"
  );