DELETE FROM edges
WHERE   from_note_id = $1 OR to_note_id = $1
