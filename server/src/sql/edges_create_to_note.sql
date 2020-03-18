INSERT INTO edges2(from_kind, to_kind, from_deck_id, to_note_id)
VALUES ('$from_kind'::node_kind, 'note'::node_kind, $1, $2)
RETURNING $table_fields
