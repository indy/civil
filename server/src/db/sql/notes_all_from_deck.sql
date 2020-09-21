SELECT n.id,
       n.content
FROM   notes n
WHERE  n.deck_id = $1
ORDER BY n.id;
