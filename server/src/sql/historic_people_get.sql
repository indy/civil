SELECT p.id,
       p.name,
       p.age,
       p.birth_date_id,
       p.birth_location_id,
       p.death_date_id,
       p.death_location_id,
FROM historic_people p
WHERE p.id = $1 AND p.user_id = $2
