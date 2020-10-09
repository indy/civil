INSERT INTO notes(user_id, deck_id, point_id, content)
VALUES ($1, $2, $3, $4)
RETURNING $table_fields
