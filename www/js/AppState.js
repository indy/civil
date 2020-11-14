import { addSortYear } from '/js/eras.js';
import { opposingKind } from '/js/JsUtils.js';

export const initialState = {
  user: undefined,
  // when a user is logged in:
  // user: {
  //   username: ...
  //   email: ...
  // },

  acLoaded: false,
  ac: {
    // an array of { id, name, resource }
    decks: []
  },
  // an array which is indexed by deck_id, returns the offset into state.ac.decks
  deckIndexFromId: [],

  fullGraphLoaded: false,
  fullGraph: [],

  cache: {
    deck: {}
  },

  recentImages: [],
  imageDirectory: '',


  // key == resource name of decks
  deckkindsLoaded: {
    ideas: false,
    publications: false,
    people: false,
    timelines: false
  },
  deckkindsListing: {
    ideas: [],           // when listing ideas on /ideas page
    publications: [],
    people: [],
    timelines: []
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
  case 'uberSetup':
    return {
      ...state,
      imageDirectory: action.imageDirectory,
      recentImages: action.recentImages,
      acLoaded: true,
      ac: {
        decks: action.autocompleteDecks.map(autocompleteTransform)
      },
      deckIndexFromId: buildDeckIndex(action.autocompleteDecks),
      deckLabels: buildDeckLabels(action.autocompleteDecks),
      fullGraphLoaded: true,
      fullGraph: buildFullGraph(action.graphConnections)
    };
  case 'setRecentImages':
    return {
      ...state,
      recentImages: action.recentImages
    };
  case 'setImageDirectory':
    return {
      ...state,
      imageDirectory: action.imageDirectory
    };
  case 'setUser':
    return {
      ...state,
      user: action.user
    };
  case 'loadAutocomplete':
    return {
      ...state,
      acLoaded: true,
      ac: {
        decks: action.decks.map(autocompleteTransform)
      },
      deckIndexFromId: buildDeckIndex(action.decks),
      deckLabels: buildDeckLabels(action.decks)
    };
  case 'addAutocompleteDeck':
    {
      let decks = state.ac.decks;
      decks.push(autocompleteTransform({
        id: action.id,
        name: action.name,
        resource: action.resource
      }));
      return {
        ...state,
        ac: {
          decks: decks
        }
      };
    }
  case 'addAutocompleteDecks':
    {
      let decks = state.ac.decks;
      action.newDecks.forEach(newDeck => decks.push(autocompleteTransform({
        id: newDeck.id,
        name: newDeck.name,
        resource: newDeck.resource
      })));
      return {
        ...state,
        ac: {
          decks: decks
        }
      };
    }
  case 'loadFullGraph':
    {
      return {
        ...state,
        fullGraphLoaded: true,
        fullGraph: buildFullGraph(action.graphConnections)
      };
    }

  case 'setCurrentDeckId':
    {
      return state;
    }
  case 'cacheDeck':
    {
      let deck = action.newItem;
      let updatedDeck = applyDecksToNotes(deck);

      let newState = { ...state };
      newState.cache.deck[action.id] = updatedDeck;

      return newState;
    }
  case 'deleteDeck':
    {
      let filterFn = d => d.id !== action.id;
      let newState = { ...state,
                       ac: {
                         decks: state.ac.decks.filter(filterFn)
                       },
                       deckkindsListing: {
                         ideas: {
                           all: state.deckkindsListing.ideas.all.filter(filterFn),
                           orphans: state.deckkindsListing.ideas.orphans.filter(filterFn),
                           recent: state.deckkindsListing.ideas.recent.filter(filterFn),
                         },
                         publications: {
                           all: state.deckkindsListing.publications.all.filter(filterFn),
                           orphans: state.deckkindsListing.publications.orphans.filter(filterFn),
                           recent: state.deckkindsListing.publications.recent.filter(filterFn),
                           rated: state.deckkindsListing.publications.rated.filter(filterFn),
                         },
                         people: state.deckkindsListing.people.filter(filterFn),
                         timelines: state.deckkindsListing.timelines.filter(filterFn)
                       }
                     };
      delete newState.fullGraph[action.id];
      // todo: delete all the other references in fullGraph to action.id
      delete newState.cache.deck[action.id];
      return newState;

    }
    // sets the listing values for a particular deck kind
  case 'setDeckListing':
    {
      let loaded = { ...state.deckkindsLoaded };
      loaded[action.resource] = true;

      let listing = {...state.deckkindsListing };
      listing[action.resource] = action.listing;

      if (action.resource === 'people') {
        listing[action.resource].forEach(addSortYear);
      }

      let newState = {
        ...state,
        deckkindsLoaded: loaded,
        deckkindsListing: listing
      };

      return newState;
    }
  case 'setPerson':
    {
      let newState = { ...state };
      newState.cache.deck[action.newItem.id] = action.newItem;
      updateListOfNames(newState.deckkindsListing.people, action.newItem);
      return newState;
    }
  case 'setTimeline':
    {
      let newState = { ...state };
      updateListOfTitles(newState.deckkindsListing.timelines, action.newItem);
      return newState;
    }
  default:
    return state;
  }
};

function updateListOfTitles(arr, obj) {
  let isEntry = false;
  // check if the title of obj has changed, update the listing array if necessary
  //
  arr.forEach(a => {
    if (a.id === obj.id) {
      isEntry = true;
      a.title = obj.title;
    }
  });

  if (!isEntry) {
    // this is a new entry, place it at the start of the list
    arr.unshift({id: obj.id, title: obj.title});
  }
}

function updateListOfNames(arr, obj) {
  let isEntry = false;
  // check if the title of obj has changed, update the listing array if necessary
  //
  arr.forEach(a => {
    if (a.id === obj.id) {
      isEntry = true;
      a.name = obj.name;
    }
  });

  if (!isEntry) {
    // this is a new entry, place it at the start of the list
    arr.unshift({id: obj.id, name: obj.name});
  }
}


function packedToKind(packed) {
  switch(packed) {
  case 0: return 'ref';
  case -1: return 'ref_to_parent';
  case 1: return 'ref_to_child';
  case 42: return 'ref_in_contrast';
  case 99: return 'ref_critical';
  default: {
    console.log(`packed_to_kind invalid value: ${packed}`);
    return 'packed_to_kind ERROR';
  }
  }
}

function buildFullGraph(graphConnections) {
  let res = {};

  for (let i = 0; i < graphConnections.length; i += 4) {
    let fromDeck = graphConnections[i + 0];
    let toDeck = graphConnections[i + 1];
    let packedKind = graphConnections[i + 2];
    let strength = graphConnections[i + 3];

    let kind = packedToKind(packedKind);

    if (!res[fromDeck]) {
      res[fromDeck] = new Set();
    }
    res[fromDeck].add([toDeck, kind, strength]);

    if (!res[toDeck]) {
      res[toDeck] = new Set();
    }
    res[toDeck].add([fromDeck, opposingKind(kind), -strength]);
  }

  return res;
}

function buildDeckIndex(decks) {
  let res = [];

  decks.forEach((d, i) => {
    res[d.id] = i;
  });

  return res;
}

function buildDeckLabels(decks) {
  let res = [];

  decks.forEach(d => {
    res[d.id] = d.name;
  });

  return res;
}

function applyDecksToNotes(obj) {
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


function autocompleteTransform(deck) {
  deck.comparisonName = deck.name.toLowerCase();
  return deck;
}
