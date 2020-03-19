DELETE FROM edges2
WHERE   from_note_id = $1 OR to_note_id = $1
