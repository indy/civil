select p.id as id,
       p.name as name,
       t.textual as age,

       t.date_start_id as birth_date_id,
       bd.textual as bd_textual,
       bd.exact_date as bd_exact_date,
       bd.lower_date as bd_lower_date,
       bd.upper_date as bd_upper_date,
       bd.fuzz as bd_fuzz,

       bl.id as birth_location_id,
       bl.textual as bl_textual,
       bl.longitude as bl_longitude,
       bl.latitude as bl_latitude,
       bl.fuzz as bl_fuzz,

       t.date_end_id as death_date_id,
       dd.textual as dd_textual,
       dd.exact_date as dd_exact_date,
       dd.lower_date as dd_lower_date,
       dd.upper_date as dd_upper_date,
       dd.fuzz as dd_fuzz,

       dl.id as death_location_id,
       dl.textual as dl_textual,
       dl.longitude as dl_longitude,
       dl.latitude as dl_latitude,
       dl.fuzz as dl_fuzz
from decks p left outer join locations bl on p.location_id = bl.id
             left outer join locations dl on p.location2_id = dl.id,
     timespans t left outer join dates bd on t.date_start_id = bd.id
                 left outer join dates dd on t.date_end_id = dd.id
where p.user_id = $1 and p.kind = 'historic_person' and t.id = p.timespan_id;
