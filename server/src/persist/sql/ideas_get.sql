SELECT id, title
FROM ideas
WHERE user_id = $1 and id = $2
