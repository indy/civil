UPDATE notes_decks
SET  kind = $3
WHERE note_id = $2 and deck_id = $1
