ALTER TABLE posts ADD COLUMN status ENUM('draft','published') NOT NULL DEFAULT 'published' AFTER is_pinned;
