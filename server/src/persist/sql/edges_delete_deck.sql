DELETE FROM decks_notes
WHERE   deck_id = $1;

DELETE FROM notes_decks
WHERE   deck_id = $1;
