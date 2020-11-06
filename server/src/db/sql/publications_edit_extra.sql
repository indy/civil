UPDATE publication_extras
SET source = $2, author = $3, short_description = $4, rating = $5
WHERE deck_id = $1
RETURNING $table_fields
