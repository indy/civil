select p.id,
       p.title,
       p.location_textual,
       p.longitude,
       p.latitude,
       p.location_fuzz,
       p.date_textual,
       p.exact_date,
       p.lower_date,
       p.upper_date,
       p.date_fuzz
from   decks d,
       points p,
       decks_points dp
where  d.user_id = $1
       and d.id = $2
       and dp.deck_id = d.id
       and dp.point_id = p.id
