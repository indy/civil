DELETE FROM edges2
WHERE   (from_kind = 'note'::node_kind AND from_note_id = $1)
        OR (to_kind = 'note'::node_kind AND to_note_id = $1)
