SELECT id, name
FROM decks
WHERE user_id = $1 AND kind = '$deck_kind'::deck_kind
ORDER BY name
