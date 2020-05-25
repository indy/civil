export function cacheDeck(dispatch, holder) {
  dispatch({
    type: 'cacheDeck',
    id: holder.id,
    newItem: holder
  });
}

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
          conn.forEach(([id, strength]) => {
            // add a link between a and id
            resultSet.add([a, id, strength]);
            if (!visitedSet.has(id)) {
              futureSet.add(id);
            }
          });
        }
        visitedSet.add(a);
      }
    }
  }

  // set will now contain some redundent connections
  // e.g. [123, 142, 1] as well as [142, 123, -1]
  // remove these negative strength dupes, however there may still be some
  // negative strength entries which represent incoming only connections,
  // these need to be retained (but with their from,to swapped around and
  // strength negated)
  //

  let checkSet = {};
  let res = [];
  for (let [from, to, strength] of resultSet) {
    if (strength > 0) {
      res.push([from, to, strength]);

      if (!checkSet[from]) {
        checkSet[from] = new Set();
      }
      checkSet[from].add(to);
    }
  }

  for (let [from, to, strength] of resultSet) {
    if (strength < 0) {
      if (!(checkSet[to] && checkSet[to].has(from))) {
        // an incoming connection
        res.push([to, from, -strength]);
        // no need to add [to, from] to checkSet, as there won't be another similar entry
      }
    }
  }

  return res;
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
