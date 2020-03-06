SELECT p.id,
       p.name,
       p.age,

       p.birth_date_id,
       bd.textual as bd_textual,
       bd.exact_date as bd_exact_date,
       bd.lower_date as bd_lower_date,
       bd.upper_date as bd_upper_date,
       bd.fuzz as bd_fuzz,

       p.birth_location_id,
       bl.textual as bl_textual,
       bl.longitude as bl_longitude,
       bl.latitude as bl_latitude,
       bl.fuzz as bl_fuzz,

       p.death_date_id,
       dd.textual as dd_textual,
       dd.exact_date as dd_exact_date,
       dd.lower_date as dd_lower_date,
       dd.upper_date as dd_upper_date,
       dd.fuzz as dd_fuzz,

       p.death_location_id,
       dl.textual as dl_textual,
       dl.longitude as dl_longitude,
       dl.latitude as dl_latitude,
       dl.fuzz as dl_fuzz
FROM historic_people p
LEFT OUTER JOIN dates bd ON p.birth_date_id = bd.id
LEFT OUTER JOIN dates dd ON p.death_date_id = dd.id
LEFT OUTER JOIN locations bl ON p.birth_location_id = bl.id
LEFT OUTER JOIN locations dl ON p.death_location_id = dl.id
WHERE user_id = $1
