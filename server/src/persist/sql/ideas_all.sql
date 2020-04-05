SELECT id, title
FROM ideas
WHERE user_id = $1
ORDER BY created_at desc
