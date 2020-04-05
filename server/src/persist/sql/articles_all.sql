SELECT id, name, source, author
FROM decks
WHERE user_id = $1 and kind = 'article'
ORDER BY created_at desc
