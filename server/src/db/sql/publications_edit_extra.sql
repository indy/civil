UPDATE publication_extras
SET source = $2, author = $3
WHERE deck_id = $1
RETURNING $table_fields
