select d.id, d.kind::TEXT as kind, d.name, count(*) as occurences
from notes n,
     decks d
where to_tsvector(n.content) @@ to_tsquery($2)
      and n.deck_id = d.id
      and n.user_id = $1
group by d.id
order by occurences DESC
limit 10;
