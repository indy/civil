SELECT id, name
FROM decks
WHERE kind = '$deck_kind'::deck_kind
ORDER BY name
