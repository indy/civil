INSERT INTO decks(kind, user_id, name)
VALUES ('person'::deck_kind, $1, $2)
RETURNING $table_fields
