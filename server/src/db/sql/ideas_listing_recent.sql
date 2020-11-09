select d.id, d.name, d.created_at, d.graph_terminator, ie.idea_category
from decks d left join idea_extras ie on ie.deck_id=d.id
where d.user_id = $1 and d.kind = 'idea'
order by d.created_at desc
limit 20;
