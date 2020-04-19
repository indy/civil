select d.id, d.kind::TEXT as kind, d.name, ts_rank_cd(textsearch, query) AS rank_sum, 1 as rank_count
from decks d,
     phraseto_tsquery($2) query,
     to_tsvector(coalesce(d.name, '') || ' ' || coalesce(d.source, '') || ' ' || coalesce(d.author, '')) textsearch
where textsearch @@ query
      and d.user_id = $1
group by d.id, textsearch, query
order by rank_sum desc
limit 10;
