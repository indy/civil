DELETE FROM edges
WHERE   from_deck_id = $1 OR to_deck_id = $1
