SELECT COUNT(*) AS mention_count,
       tag.id AS id,
       tag.name AS name
FROM  tags tag,
      tags_notes dn,
      notes_decks nd
WHERE dn.tag_id = tag.id
      AND dn.note_id = nd.note_id
      AND nd.deck_id = $1
GROUP BY tag.id
ORDER BY mention_count DESC, tag.name
