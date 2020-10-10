INSERT INTO decks(kind, user_id, name)
VALUES ('timeline'::deck_kind, $1, $2)
RETURNING $table_fields
