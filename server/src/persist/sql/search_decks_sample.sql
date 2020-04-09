select d.id, d.kind, d.name, count(*) as occurences
from notes n,
     decks_notes dn,
     decks d
where to_tsvector(n.content) @@ to_tsquery('lenin')
      and n.id = dn.note_id
      and dn.deck_id = d.id
      and n.user_id = 1
group by d.id
order by occurences DESC
limit 10;
