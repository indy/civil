UPDATE idea_extras
SET idea_category = $2
WHERE deck_id = $1
RETURNING $table_fields
