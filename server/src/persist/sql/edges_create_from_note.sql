INSERT INTO edges(from_kind, to_kind, from_note_id, to_deck_id)
VALUES ('note'::node_kind, '$to_kind'::node_kind, $1, $2)
RETURNING $table_fields
