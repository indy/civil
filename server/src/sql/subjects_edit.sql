UPDATE subjects
SET name = $3
WHERE id = $1 and user_id = $2
RETURNING $table_fields
