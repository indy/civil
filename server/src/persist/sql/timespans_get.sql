SELECT id, textual, date_start_id, date_end_id
FROM timespans
WHERE id = $1
