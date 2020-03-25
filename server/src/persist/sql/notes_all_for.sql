SELECT n.id,
       n.note_type,
       n.source,
       n.content,
       n.title,
       n.separator
FROM   notes n,
       edges e
WHERE  e.from_deck_id = $1
       AND e.to_note_id = n.id
       AND n.note_type = $2
ORDER BY n.id;
