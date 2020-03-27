INSERT INTO decks(user_id, name, source, kind)
VALUES ($1, $2, $3, 'book'::deck_kind)
RETURNING $table_fields
