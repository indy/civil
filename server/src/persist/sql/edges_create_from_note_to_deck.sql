INSERT INTO notes_decks(note_id, deck_id)
VALUES ($1, $2)
RETURNING $table_fields
