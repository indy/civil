SELECT COUNT(*) AS mention_count,
       p.id AS id,
       p.name AS name
FROM edges e1,
     edges e2,
     notes n,
     decks p
WHERE e1.from_kind = '$from_kind'::node_kind
       AND e1.from_deck_id = p.id
       AND e1.to_kind = 'note'::node_kind
       AND e1.to_note_id = n.id
       AND e2.from_kind = 'note'::node_kind
       AND e2.from_note_id = n.id
       AND e2.to_kind = '$to_kind'::node_kind
       AND e2.to_deck_id = $1
GROUP BY p.id
ORDER BY mention_count DESC, p.name
