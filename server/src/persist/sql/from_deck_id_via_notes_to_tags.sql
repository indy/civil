SELECT note.id as note_id,
       tag.id as id,
       tag.name as name
FROM   decks_notes dn,
       notes_tags nt,
       notes note,
       tags tag
WHERE  dn.deck_id = $1
       AND dn.note_id = note.id
       AND nt.note_id = note.id
       AND nt.tag_id = tag.id;
