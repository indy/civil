SELECT n.id as note_id,
       d.id as id,
       d.name as name,
       d.kind::TEXT as kind
FROM   tags_notes tn,
       notes_decks nd,
       notes n,
       decks d
WHERE  tn.tag_id = $1
       AND tn.note_id = n.id
       AND nd.note_id = n.id
       AND nd.deck_id = d.id;
