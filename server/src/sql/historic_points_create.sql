INSERT INTO historic_points(user_id, title, date_id, location_id)
VALUES ($1, $2, $3, $4)
RETURNING $table_fields
