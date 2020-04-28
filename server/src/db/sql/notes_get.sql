SELECT n.id,
       n.content,
       n.title,
       n.separator
FROM notes n
WHERE n.id = $1 AND n.user_id = $2
