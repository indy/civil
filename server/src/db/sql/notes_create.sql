INSERT INTO notes(user_id, deck_id, title, content, separator, sidenote)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING $table_fields
