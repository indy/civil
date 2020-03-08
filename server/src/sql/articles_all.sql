SELECT id, title, source
FROM articles
WHERE user_id = $1
