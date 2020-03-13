UPDATE entries
SET content= $1
WHERE id = $2 and user_id = $3
RETURNING $table_fields
