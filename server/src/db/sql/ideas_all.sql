SELECT id, name, created_at, idea_category
FROM decks
WHERE user_id = $1 and kind = 'idea'
ORDER BY name
