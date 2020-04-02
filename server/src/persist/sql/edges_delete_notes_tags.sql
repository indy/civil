DELETE FROM notes_tags
WHERE note_id = $1 AND tag_id = $2
