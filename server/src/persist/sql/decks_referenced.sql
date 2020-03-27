SELECT n.id as note_id,
       d.id as id,
       d.name as name
FROM   decks_notes e1,
       notes_decks e2,
       notes n,
       decks d
WHERE  e1.deck_id = $1
       AND e1.note_id = n.id
       AND e2.note_id = n.id
       AND e2.deck_id = d.id
       AND d.kind = '$to_kind'::deck_kind;
