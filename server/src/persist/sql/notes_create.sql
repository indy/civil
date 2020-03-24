INSERT INTO notes(user_id, note_type, source, content, separator)
VALUES ($1, $2, $3, $4, $5)
RETURNING $table_fields
