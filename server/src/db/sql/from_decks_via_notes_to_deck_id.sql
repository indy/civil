SELECT COUNT(*) AS mention_count,
       d.id AS id,
       d.name AS name,
       d.kind
FROM decks d,
     notes n,
     notes_decks nd
WHERE n.deck_id = d.id
      AND nd.note_id = n.id
      AND nd.deck_id = $1
GROUP BY d.id
ORDER BY mention_count DESC, d.name
