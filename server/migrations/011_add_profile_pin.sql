ALTER TABLE posts ADD COLUMN is_profile_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_pinned;
