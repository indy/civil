UPDATE notes
SET content = $4, title = $5, separator = $6, sidenote = $7
WHERE id = $2 and user_id = $1
RETURNING $table_fields
