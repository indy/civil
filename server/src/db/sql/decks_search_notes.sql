select res.id, res.kind, res.name, sum(res.rank) as rank_sum, count(res.rank) as rank_count
from (select d.id, d.kind, d.name, ts_rank_cd(textsearch, query) AS rank
      from decks d left join notes n on n.deck_id = d.id,
           plainto_tsquery($2) query,
           to_tsvector(coalesce(n.content, '') || ' ' || coalesce(n.title, '')) textsearch
      where textsearch @@ query
            and d.user_id = $1
            group by d.id, textsearch, query
            order by rank desc) res
group by res.id, res.kind, res.name
order by sum(res.rank) desc
limit 10;
