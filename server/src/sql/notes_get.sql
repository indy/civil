SELECT n.id,
       n.source,
       n.content,
       n.annotation,
       n.separator
FROM notes n
WHERE n.id = $1 AND n.user_id = $2