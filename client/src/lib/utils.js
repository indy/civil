export function cacheDeck(dispatch, holder) {
  dispatch({
    type: 'cacheDeck',
    id: holder.id,
    newItem: holder
  });
}

export function findPoint(points, title) {
  let p = points.find(p => p.title === title);
  if (p === undefined) {
    p = {};
  }
  return p;
}

export function applyDecksToNotes(obj) {
  const decksInNotes = hashByNoteIds(obj.decks_in_notes);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.decks = decksInNotes[n.id];
  }

  return obj;
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
