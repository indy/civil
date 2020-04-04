INSERT INTO decks(kind, user_id, name, timespan_id, location_id, location2_id)
VALUES ('person'::deck_kind, $1, $2, $3, $4, $5)
RETURNING $table_fields
