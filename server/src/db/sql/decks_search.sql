select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank_sum, 1 as rank_count
from decks d
     left join publication_extras pe on pe.deck_id = d.id,
     plainto_tsquery($2) query,
     to_tsvector(coalesce(d.name, '') || ' ' || coalesce(pe.source, '') || ' ' || coalesce(pe.author, '')) textsearch
where textsearch @@ query
      and d.user_id = $1
group by d.id, textsearch, query
order by rank_sum desc
limit 10;
