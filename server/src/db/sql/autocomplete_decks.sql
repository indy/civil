SELECT id, name, kind::TEXT as kind
FROM decks
WHERE user_id = $1
ORDER BY kind, name
