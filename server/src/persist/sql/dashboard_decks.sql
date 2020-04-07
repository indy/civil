SELECT id, name, kind::TEXT
FROM decks
WHERE user_id = $1 AND kind = '$deck_kind'::deck_kind
ORDER BY created_at DESC
LIMIT $limit
