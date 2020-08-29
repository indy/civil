SELECT id, name, kind
FROM decks
WHERE user_id = $1
ORDER BY name
