INSERT INTO notes(user_id, deck_id, content)
VALUES ($1, $2, $3)
RETURNING $table_fields
