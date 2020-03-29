SELECT id, name
FROM tags
WHERE user_id = $1 and id = $2
