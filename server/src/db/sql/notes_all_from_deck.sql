SELECT n.id,
       n.note_type,
       n.source,
       n.content,
       n.title,
       n.separator
FROM   notes n
WHERE  n.deck_id = $1
ORDER BY n.id;
