SELECT n.id,
       n.content,
       n.point_id
FROM   notes n
WHERE  n.deck_id = $1
ORDER BY n.id;
