INSERT INTO notes(user_id, deck_id, note_type, title, source, content, separator)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING $table_fields
