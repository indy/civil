INSERT INTO decks(kind, user_id, name, date_id, location_id)
VALUES ('historic_point'::deck_kind, $1, $2, $3, $4)
RETURNING $table_fields
