-- Fresh-schema migration only. Existing legacy production database must use the reviewed forward migration procedure.
ALTER TABLE admin_users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor'));
