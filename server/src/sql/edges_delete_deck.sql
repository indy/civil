DELETE FROM edges2
WHERE   (from_kind = '$kind'::node_kind AND from_deck_id = $1)
        OR (to_kind = '$kind'::node_kind AND to_deck_id = $1)
