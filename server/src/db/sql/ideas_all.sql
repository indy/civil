SELECT id, name, created_at
FROM decks
WHERE user_id = $1 and kind = 'idea'
ORDER BY name
