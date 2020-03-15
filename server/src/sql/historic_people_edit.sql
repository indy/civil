UPDATE historic_people
SET name = $3
WHERE id = $2 and user_id = $1
RETURNING $table_fields
