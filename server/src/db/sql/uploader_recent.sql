SELECT filename
FROM images
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 5
