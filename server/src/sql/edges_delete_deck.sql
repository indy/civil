DELETE FROM edges2
WHERE   from_deck_id = $1 OR to_deck_id = $1
