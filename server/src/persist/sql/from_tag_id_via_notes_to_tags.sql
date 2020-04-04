SELECT note.id as note_id,
       tag.id as id,
       tag.name as name
FROM   tags_notes tn,
       notes_tags nt,
       notes note,
       tags tag
WHERE  tn.tag_id = $1
       AND tn.note_id = note.id
       AND nt.note_id = note.id
       AND nt.tag_id = tag.id;
