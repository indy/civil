INSERT INTO decks(user_id, name, kind)
VALUES ($1, $2, 'tag'::deck_kind)
RETURNING $table_fields
