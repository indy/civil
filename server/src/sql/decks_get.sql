SELECT id, kind, name, source, date_id, location_id, timespan_id, location2_id
FROM decks
WHERE id = $1 and user_id = $2
