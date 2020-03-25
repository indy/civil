INSERT INTO notes(user_id, note_type, title, source, content, separator)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING $table_fields
