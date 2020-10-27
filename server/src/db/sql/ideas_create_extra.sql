INSERT INTO idea_extras(deck_id, idea_category)
VALUES ($1, $2)
RETURNING $table_fields
