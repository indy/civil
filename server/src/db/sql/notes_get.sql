SELECT n.id,
       n.source,
       n.content,
       n.title,
       n.separator,
       n.sidenote
FROM notes n
WHERE n.id = $1 AND n.user_id = $2
