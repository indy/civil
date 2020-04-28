INSERT INTO notes(user_id, deck_id, title, content, separator)
VALUES ($1, $2, $3, $4, $5)
RETURNING $table_fields
