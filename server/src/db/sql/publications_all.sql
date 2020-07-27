SELECT id, name, source, author, created_at
FROM decks
WHERE user_id = $1 and kind = 'publication'
ORDER BY created_at desc
