UPDATE ideas
SET title = $3
WHERE user_id = $1 and id = $2
RETURNING $table_fields
