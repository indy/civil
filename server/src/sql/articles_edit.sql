UPDATE articles
SET title = $3, source = $4
WHERE id = $1 and user_id = $2
RETURNING $table_fields
