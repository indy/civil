import { addSortYear } from '/js/eras.js';
import { opposingKind } from '/js/JsUtils.js';
import { sortByResourceThenName, sortByTitle } from '/js/CivilUtils.js';

export const initialState = {
  user: undefined,
  // when a user is logged in:
  // user: {
  //   username: ...
  //   email: ...
  // },

  readOnly: false,

  // by default don't show the note form, just show the "Append Note" icon
  // this can be switched on via the SearchCommand bar
  //
  showNoteForm: false,
  // same for the Add Point form
  showAddPointForm: false,

  showConnectivityGraph: false,
  graph: {
    fullyLoaded: false,
    // an array of { id, name, resource }
    decks: [],
    links: [],
    // an array which is indexed by deck_id, returns the offset into state.graph.decks
    deckIndexFromId: []
  },

  cache: {
    deck: {}
  },

  // oldest reasonable age in years, any person whose birth means they're older can be assumed to be dead
  oldestAliveAge: 120,

  recentImages: [],
  imageDirectory: '',

  verboseUI: false,
  preferredOrder: ["ideas", "people", "articles", "timelines"],

  // key == resource name of decks
  listing: {
    ideas: undefined,           // when listing ideas on /ideas page
    articles: undefined,
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
      graph: {
        fullyLoaded: false
      },
      srReviewCount: action.srReviewCount,
      srEarliestReviewDate: action.srEarliestReviewDate
    };
  case 'loadGraph':
    return {
      ...state,
      graph: {
        fullyLoaded: true,
        decks: action.graphNodes,
        links: buildFullGraph(action.graphConnections),
        deckIndexFromId: buildDeckIndex(action.graphNodes)
      }
    }
  case 'cleanUI':
    return {
      ...state,
      verboseUI: false
    };
  case 'basicUI':
    return {
      ...state,
      verboseUI: true
    };
  case 'showNoteForm':
    return {
      ...state,
      showNoteForm: true
    };
  case 'hideNoteForm':
    return {
      ...state,
      showNoteForm: false
    };
  case 'showAddPointForm':
    return {
      ...state,
      showAddPointForm: true
    };
  case 'hideAddPointForm':
    return {
      ...state,
      showAddPointForm: false
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
  case 'lock':
    return {
      ...state,
      readOnly: true
    };
  case 'unlock':
    return {
      ...state,
      readOnly: false
    };
  case 'connectivityGraphShow':
    return {
      ...state,
      showConnectivityGraph: true
    };
  case 'connectivityGraphHide':
    return {
      ...state,
      showConnectivityGraph: false
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

  case 'invalidateGraph': {
    let newState = {...state };
    newState.graph.fullyLoaded = false;

    return newState;
  }
  case 'noteRefsModified':
    {
      let newState = {...state};

      let changes = action.changes;

      // update the newState.listing with new ideas that were created in action.changes.referencesCreated
      //
      function basicNoteFromReference(r) {
        return {
          debug: "created by basicNoteFromReference",
          backnotes: null,
          backrefs: null,
          created_at: "",
          flashcards: null,
          graph_terminator: false,
          id: r.id,
          notes: null,
          refs: null,
          title: r.name
        };
      };

      if (action.changes.referencesCreated.length > 0) {
        newState.graph.fullyLoaded = false;
      }

      if (newState.listing.ideas) {
        action.changes.referencesCreated.forEach(r => {
          let newReference = action.allDecksForNote.find(d => d.name === r.name && d.resource === "ideas");
          let newBasicNote = basicNoteFromReference(newReference);
          // update the listing with the new resource
          newState.listing.ideas.recent.unshift(newBasicNote);
          newState.listing.ideas.unnoted.unshift(newBasicNote);
        });
      }

      // decks that are referenced by this note may have their state changed (e.g. annotation changed,
      // a backref value added/deleted depending on if the deck was added or removed), so the easiest
      // thing to do is remove the deck from the cache, and refetch it from the server
      //
      [changes.referencesChanged, changes.referencesAdded, changes.referencesRemoved].forEach(rs => {
        rs.forEach(r => {
          if (newState.cache.deck[r.id]) {
            delete newState.cache.deck[r.id];
          }
        });
      });

      return newState;
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
  case 'deleteDeck': {
    let filterFn = d => d.id !== action.id;

    let newState = { ...state };
    newState.graph.decks = state.graph.decks.filter(filterFn);
    newState.listing = {};

    if (state.listing.ideas) {
      newState.listing.ideas = {
        orphans: state.listing.ideas.orphans.filter(filterFn),
        recent: state.listing.ideas.recent.filter(filterFn),
      };
    };

    if (state.listing.articles) {
      newState.listing.articles = {
        orphans: state.listing.articles.orphans.filter(filterFn),
        recent: state.listing.articles.recent.filter(filterFn),
        rated: state.listing.articles.rated.filter(filterFn),
      };
    }

    if (state.listing.people) {
      newState.listing.people = state.listing.people.filter(filterFn);
    }

    if (state.listing.timelines) {
      newState.listing.timelines = state.listing.timelines.filter(filterFn);
    }

    delete newState.graph.links[action.id];
    // todo: delete all the other references in graph.links to action.id
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
      if (newState.listing.people) {
        updateListOfNames(newState.listing.people, action.newItem);
      }
      return newState;
    }
  case 'setTimeline':
    {
      let newState = { ...state };
      if (newState.listing.timelines) {
        updateListOfTitles(newState.listing.timelines, action.newItem);
      }
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

function applyDecksAndCardsToNotes(obj) {
  const decksInNotes = hashByNoteIds(obj.refs);
  const cardsInNotes = hashByNoteIds(obj.flashcards);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.decks = decksInNotes[n.id] || [];
    n.decks.sort(sortByResourceThenName);
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
