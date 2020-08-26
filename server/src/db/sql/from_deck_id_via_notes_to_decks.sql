SELECT n.id as note_id,
       d.id as id,
       d.name as name,
       d.kind::TEXT as deck_kind,
       nd.kind as ref_kind
FROM   notes n,
       notes_decks nd,
       decks d
WHERE  n.deck_id = $1
       AND nd.note_id = n.id
       AND nd.deck_id = d.id;
