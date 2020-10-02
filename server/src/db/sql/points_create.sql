INSERT INTO points(deck_id, title, kind, location_textual, longitude, latitude, location_fuzz, date_textual, exact_date, lower_date, upper_date, date_fuzz)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING $table_fields
