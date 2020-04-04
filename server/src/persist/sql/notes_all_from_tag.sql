SELECT n.id,
       n.note_type,
       n.source,
       n.content,
       n.title,
       n.separator
FROM   notes n,
       tags_notes tn
WHERE  tn.tag_id = $1
       AND tn.note_id = n.id
ORDER BY n.id;
