SELECT n.id,
       n.note_type,
       n.source,
       n.content,
       n.title,
       n.separator
FROM   notes n,
       decks_notes dn
WHERE  dn.deck_id = $1
       AND dn.note_id = n.id
ORDER BY n.id;