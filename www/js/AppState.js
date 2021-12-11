import { addSortYear } from '/js/eras.js';
import { opposingKind } from '/js/JsUtils.js';
import { referencesSortFunction } from '/js/CivilUtils.js';

export const initialState = {
  user: undefined,
  // when a user is logged in:
  // user: {
  //   username: ...
  //   email: ...
  // },

  readOnly: false,

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

  // oldest reasonable age in years, any person whose birth means they're older can be assumed to be dead
  oldestAliveAge: 120,

  recentImages: [],
  imageDirectory: '',

  preferredOrder: ["ideas", "people", "publications", "timelines"],

  // key == resource name of decks
  listing: {
    ideas: undefined,           // when listing ideas on /ideas page
    publications: undefined,
    people: undefined,
    timelines: undefined
  },

  srReviewCount: 0,
  srEarliestReviewDate: undefined
};

export const reducer = (state, action) => {
  switch (action.type) {
  case 'uberSetup':
    return {
      ...state,
      imageDirectory: action.imageDirectory,
      recentImages: action.recentImages,
      ac: {
        decks: action.autocompleteDecks.map(autocompleteTransform)
      },
      deckIndexFromId: buildDeckIndex(action.autocompleteDecks),
      deckLabels: buildDeckLabels(action.autocompleteDecks),
      fullGraphLoaded: true,
      fullGraph: buildFullGraph(action.graphConnections),
      srReviewCount: action.srReviewCount,
      srEarliestReviewDate: action.srEarliestReviewDate
    };
  case 'setLock':
    return {
      ...state,
      readOnly: action.readOnly
    };
  case 'toggleLock':
    return {
      ...state,
      readOnly: !state.readOnly
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
  case 'setReviewCount':
    return {
      ...state,
      srReviewCount: action.srReviewCount
    };
  case 'loadAutocomplete':
    return {
      ...state,
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
      let updatedDeck = applyDecksAndCardsToNotes(deck);

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
                       listing: {}
                     };

      if (state.listing.ideas) {
        newState.listing.ideas = {
          all: state.listing.ideas.all.filter(filterFn),
          orphans: state.listing.ideas.orphans.filter(filterFn),
          recent: state.listing.ideas.recent.filter(filterFn),
        };
      };

      if (state.listing.publications) {
        newState.listing.publications = {
          all: state.listing.publications.all.filter(filterFn),
          orphans: state.listing.publications.orphans.filter(filterFn),
          recent: state.listing.publications.recent.filter(filterFn),
          rated: state.listing.publications.rated.filter(filterFn),
        };
      }

      if (state.listing.people) {
        newState.listing.people = state.listing.people.filter(filterFn);
      }

      if (state.listing.timelines) {
        newState.listing.timelines = state.listing.timelines.filter(filterFn);
      }

      delete newState.fullGraph[action.id];
      // todo: delete all the other references in fullGraph to action.id
      delete newState.cache.deck[action.id];
      return newState;

    }
    // sets the listing values for a particular deck kind
  case 'setDeckListing':
    {
      let listing = {...state.listing };
      listing[action.resource] = action.listing;

      if (action.resource === 'people') {
        listing[action.resource].forEach(addSortYear);
      }

      let newState = {
        ...state,
        listing: listing
      };

      return newState;
    }
  case 'setPerson':
    {
      let newState = { ...state };
      newState.cache.deck[action.newItem.id] = action.newItem;
      updateListOfNames(newState.listing.people, action.newItem);
      return newState;
    }
  case 'setTimeline':
    {
      let newState = { ...state };
      updateListOfTitles(newState.listing.timelines, action.newItem);
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

function applyDecksAndCardsToNotes(obj) {
  const decksInNotes = hashByNoteIds(obj.refs);
  const cardsInNotes = hashByNoteIds(obj.flashcards);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.decks = decksInNotes[n.id] || [];
    n.decks.sort(referencesSortFunction);
    n.flashcards = cardsInNotes[n.id];
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
