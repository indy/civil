SELECT u.id,
       u.image_count
FROM users u
WHERE u.id = $1
