INSERT INTO decks(user_id, name, kind, idea_category)
VALUES ($1, $2, 'idea'::deck_kind, $3)
RETURNING $table_fields
