ALTER TABLE posts ADD COLUMN slug VARCHAR(200) UNIQUE AFTER title;

-- Generate initial slugs from existing titles
UPDATE posts SET slug = CONCAT(
  LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '#', ''), '&', 'and'), '?', ''), '/', '-')),
  '-', id
) WHERE slug IS NULL;
