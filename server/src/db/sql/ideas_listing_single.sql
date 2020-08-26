select nd.deck_id as id, d.name, d.created_at, d.idea_category
from notes_decks nd, decks d
where nd.deck_id = d.id
      and d.kind = 'idea'
       and d.user_id = $1
group by nd.deck_id, d.name, d.created_at, d.idea_category
having count(*) = 1
order by nd.deck_id;
