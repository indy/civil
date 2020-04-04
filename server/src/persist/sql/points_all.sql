SELECT d.exact_date as sort_date,
       p.id,
       p.name,

       p.date_id,
       d.textual as date_textual,
       d.exact_date as date_exact_date,
       d.lower_date as date_lower_date,
       d.upper_date as date_upper_date,
       d.fuzz as date_fuzz,

       p.location_id,
       l.textual as location_textual,
       l.longitude as location_longitude,
       l.latitude as location_latitude,
       l.fuzz as location_fuzz
FROM decks p
LEFT OUTER JOIN dates d ON p.date_id = d.id
LEFT OUTER JOIN locations l on p.location_id = l.id
WHERE d.exact_date IS NOT NULL AND p.user_id = $1 and p.kind = 'point'
UNION ALL
SELECT d.lower_date as sort_date,
       p.id,
       p.name,

       p.date_id,
       d.textual as date_textual,
       d.exact_date as date_exact_date,
       d.lower_date as date_lower_date,
       d.upper_date as date_upper_date,
       d.fuzz as date_fuzz,

       p.location_id,
       l.textual as location_textual,
       l.longitude as location_longitude,
       l.latitude as location_latitude,
       l.fuzz as location_fuzz
FROM decks p
LEFT OUTER JOIN dates d ON p.date_id = d.id
LEFT OUTER JOIN locations l on p.location_id = l.id
WHERE d.lower_date IS NOT NULL AND p.user_id = $1 and p.kind = 'point'
ORDER BY 1;