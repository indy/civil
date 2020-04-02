SELECT tg.id AS id, tg.name AS name
FROM notes_tags nt,
     tags tg
WHERE nt.note_id = $1
      AND tg.id = nt.tag_id
