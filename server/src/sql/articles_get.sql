SELECT a.id,
       a.title,
       a.source
FROM articles a
WHERE a.id = $1 AND a.user_id = $2
