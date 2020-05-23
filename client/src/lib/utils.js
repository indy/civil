// builds outward connectivity graph (eventually this will work for inward links as well)
//
export function buildConnectivity(fullGraph, deckId, depth) {
  // console.log(fullGraphOutgoing[deckId]);
  // console.log(fullGraphIncoming[deckId]);

  let resultSet = new Set();

  let futureSet = new Set();    // nodes to visit
  let activeSet = new Set();    // nodes being visited in the current pass
  let visitedSet = new Set();   // nodes already processed

  if (fullGraph[deckId]) {
    // start with this 'root' node
    futureSet.add(deckId);

    for (let i = 0; i < depth; i++) {
      // populate the active set
      activeSet.clear();
      for (let f of futureSet) {
        if (!visitedSet.has(f)) {
          // haven't processed this node so add it to activeSet
          activeSet.add(f);
        }
      }

      for (let a of activeSet) {
        let conn = fullGraph[a];
        if (conn) {
          conn.forEach((id) => {
            // add a link between a and id
            resultSet.add([a, id]);
            if (!visitedSet.has(id)) {
              futureSet.add(id);
            }
          });
        }
        visitedSet.add(a);
      }
    }
  }

  return resultSet;
}

export function findPoint(points, title) {
  let p = points.find(p => p.title === title);
  if (p === undefined) {
    p = {};
  }
  return p;
}

export function separateIntoIdeasAndDecks(r) {
  return separateFromDecks(r, 'ideas');
}

export function applyDecksToNotes(obj) {
  let [ideas, decks] = separateIntoIdeasAndDecks(obj.decks_in_notes);
  const ideasInNotes = hashByNoteIds(ideas);
  const decksInNotes = hashByNoteIds(decks);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.ideas = ideasInNotes[n.id];
    n.decks = decksInNotes[n.id];
  }

  return obj;
}

// given an array of decks, separate out all decks of a particular resource, returning 2 arrays
function separateFromDecks(decks, resource) {
  return decks.reduce((acc, deck) => {
    acc[(deck.resource === resource) ? 0 : 1].push(deck);
    return acc;
  }, [[],[]]);
}

function hashByNoteIds(s) {
  s = s || [];
  return s.reduce(function(a, b) {
    const note_id = b.note_id;
    if (a[note_id]) {
      a[note_id].push(b);
    } else {
      a[note_id] = [b];
    }
    return a;
  }, {});
}
