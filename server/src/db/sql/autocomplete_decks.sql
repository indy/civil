SELECT id, name, kind, graph_terminator
FROM decks
WHERE user_id = $1
ORDER BY name
