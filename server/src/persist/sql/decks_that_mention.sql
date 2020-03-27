SELECT COUNT(*) AS mention_count,
       p.id AS id,
       p.name AS name
FROM decks_notes e1,
     notes_decks e2,
     notes n,
     decks p
WHERE e1.deck_id = p.id
      AND p.kind = '$from_kind'::deck_kind
      AND e1.note_id = n.id
      AND e2.note_id = n.id
      AND e2.deck_id = $1
GROUP BY p.id
ORDER BY mention_count DESC, p.name
