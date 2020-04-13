SELECT p.id,
       p.name
FROM decks p
WHERE p.user_id = $1 AND p.id = $2 AND p.kind = 'event'
