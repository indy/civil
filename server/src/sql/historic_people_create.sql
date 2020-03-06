INSERT INTO entries(user_id, content)
VALUES ($1, $2)
RETURNING $table_fields
