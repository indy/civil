SELECT s.id,
       s.name
FROM subjects s
WHERE s.id = $1 AND s.user_id = $2
