DELETE FROM notes
USING edges2
WHERE (edges2.from_deck_id = $1 and notes_id = edges2.to_note_id)
      OR (edges2.to_deck_id = $1 and notes_id = edges2.from_note_id)
