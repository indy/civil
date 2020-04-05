SELECT COUNT(*) AS mention_count,
       d.id AS id,
       d.name AS name,
       d.kind::TEXT as kind
FROM decks d,
     decks_notes dn,
     notes_decks nd
WHERE dn.deck_id = d.id
      AND dn.note_id = nd.note_id
      AND nd.deck_id = $1
GROUP BY d.id
ORDER BY mention_count DESC, d.name
