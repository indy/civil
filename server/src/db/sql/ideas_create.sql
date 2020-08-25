INSERT INTO decks(user_id, name, kind, idea)
VALUES ($1, $2, 'idea'::deck_kind, $3)
RETURNING $table_fields
