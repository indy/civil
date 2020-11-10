select id, name, created_at, graph_terminator
from decks
where user_id = $1 and id = $2 and kind = $3
