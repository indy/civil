( -- all events in the person's life (may also included relevent events that happened posthumously)
select d.id as deck_id,
       d.name as deck_name,
       d.kind as deck_kind,
       p.id as point_id,
       p.title as point_title,
       p.date_textual as point_date_textual,
       coalesce(p.exact_date, p.lower_date) as point_date
from   points p, decks d
where  d.id = $2
       and d.user_id = $1
       and p.deck_id = d.id
)
union
( -- other events that occurred during the person's life
select d.id as deck_id,
       d.name as deck_name,
       d.kind as deck_kind,
       p.id as point_id,
       p.title as point_title,
       p.date_textual as point_date_textual,
       coalesce(p.exact_date, p.lower_date) as point_date
from   points p, decks d
where  coalesce(p.exact_date, p.upper_date) >= (select coalesce(point_born.exact_date, point_born.lower_date) as born
                                                from   points point_born
                                                where  point_born.deck_id = $2
                                                       and point_born.title = 'Born')
       and coalesce(p.exact_date, p.lower_date) <= coalesce((select coalesce(point_died.exact_date, point_died.upper_date) as died
                                                             from   points point_died
                                                             where  point_died.deck_id = $2
                                                                    and point_died.title = 'Died'), CURRENT_DATE)
       and p.deck_id = d.id
       and d.id <> $2
       and d.user_id = $1
)
order by point_date;
