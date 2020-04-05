INSERT INTO ideas(user_id, title)
VALUES ($1, $2)
RETURNING $table_fields
