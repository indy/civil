UPDATE notes
SET note_type = $3, source = $4, content = $5, title = $6, separator = $7
WHERE id = $2 and user_id = $1
RETURNING $table_fields
