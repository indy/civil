SELECT id, name
FROM decks
WHERE kind = '$node_kind'::node_kind
ORDER BY name
