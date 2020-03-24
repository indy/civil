INSERT INTO timespans(textual, date_start_id, date_end_id)
VALUES ($1, $2, $3)
RETURNING $table_fields
