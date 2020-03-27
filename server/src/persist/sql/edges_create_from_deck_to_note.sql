INSERT INTO decks_notes(deck_id, note_id)
VALUES ($1, $2)
RETURNING $table_fields
