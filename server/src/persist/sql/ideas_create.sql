INSERT INTO decks(user_id, name, kind)
VALUES ($1, $2, 'idea'::deck_kind)
RETURNING $table_fields
