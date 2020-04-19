select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
from (select d.id, d.kind::TEXT as kind, d.name, ts_rank_cd(textsearch, query) AS rank
      from decks d left join points p on p.deck_id = d.id,
           phraseto_tsquery($2) query,
           to_tsvector(coalesce(p.title, '') || ' ' || coalesce(p.location_textual, '') || ' ' || coalesce(p.date_textual, '')) textsearch
      where textsearch @@ query
            and d.user_id = $1
            group by d.id, textsearch, query
            order by rank desc) res
group by res.id, res.kind, res.name
order by sum(res.rank) desc
limit 10;
