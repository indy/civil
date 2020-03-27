INSERT INTO decks(user_id, name, kind)
VALUES ($1, $2, 'subject'::deck_kind)
RETURNING $table_fields
