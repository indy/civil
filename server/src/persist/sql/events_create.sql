INSERT INTO decks(kind, user_id, name)
VALUES ('event'::deck_kind, $1, $2)
RETURNING $table_fields
