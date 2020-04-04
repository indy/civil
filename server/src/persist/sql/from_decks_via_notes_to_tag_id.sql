SELECT COUNT(*) AS mention_count,
       d.id AS id,
       d.name AS name,
       d.kind::TEXT as kind
FROM  decks d,
      decks_notes dn,
      notes_tags nt
WHERE dn.deck_id = d.id
      AND dn.note_id = nt.note_id
      AND nt.tag_id = $1
GROUP BY d.id
ORDER BY mention_count DESC, d.name
