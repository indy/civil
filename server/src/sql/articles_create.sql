INSERT INTO articles(user_id, title, source)
VALUES ($1, $2, $3)
RETURNING $table_fields
