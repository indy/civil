INSERT INTO tags(user_id, name)
VALUES ($1, $2)
RETURNING $table_fields
