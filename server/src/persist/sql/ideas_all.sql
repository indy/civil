SELECT id, name
FROM decks
WHERE user_id = $1 and kind = 'idea'
ORDER BY created_at desc