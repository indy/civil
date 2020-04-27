UPDATE notes
SET content = $3, title = $4, separator = $5, sidenote = $6
WHERE id = $2 and user_id = $1
RETURNING $table_fields
