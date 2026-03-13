-- Local user listing wizard: draft state, lock tracking, and submission status
-- homes
ALTER TABLE homes
  ADD COLUMN IF NOT EXISTS local_user_draft JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS local_user_draft_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS local_user_locked_fields JSONB DEFAULT '{}';

ALTER TABLE homes
  ADD CONSTRAINT homes_draft_status_check
    CHECK (local_user_draft_status IN ('none', 'draft', 'pending_review'));

-- facilities
ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS local_user_draft JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS local_user_draft_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS local_user_locked_fields JSONB DEFAULT '{}';

ALTER TABLE facilities
  ADD CONSTRAINT facilities_draft_status_check
    CHECK (local_user_draft_status IN ('none', 'draft', 'pending_review'));
