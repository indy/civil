SELECT n.id as note_id,
       d.id as person_id,
       d.name as person_name
FROM   edges2 e1,
       edges2 e2,
       notes n,
       decks d
WHERE  e1.from_kind = '$node_kind'::node_kind
       AND e1.from_deck_id = $1
       AND e1.to_kind = 'note'::node_kind
       AND e1.to_note_id = n.id
       AND e2.from_kind = 'note'::node_kind
       AND e2.from_note_id = n.id
       AND e2.to_kind = 'historic_person'::node_kind
       AND e2.to_deck_id = d.id;
