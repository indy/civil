DELETE FROM notes_tags
WHERE   note_id = $1;

DELETE FROM decks_notes
WHERE   note_id = $1;

DELETE FROM notes_decks
WHERE   note_id = $1;

DELETE FROM ideas_notes
WHERE   note_id = $1;
