INSERT INTO historic_people(user_id, name, age, birth_date_id, birth_location_id, death_date_id, death_location_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING $table_fields
