SELECT id, name, source, author
FROM decks
WHERE user_id = $1 and kind = 'book'
ORDER BY created_at desc
