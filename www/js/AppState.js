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

  // caching (redo this)
  //
  ideasLoaded: false,
  ideas: [],                  // when listing ideas on /ideas page
  publicationsLoaded: false,
  publications: [],
  peopleLoaded: false,
  people: [],
  eventsLoaded: false,
  events: [],
  timelinesLoaded: false,
  timelines: [],
};

export const reducer = (state, action) => {
  switch (action.type) {
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
        decks: action.decks
      },
      deckIndexFromId: buildDeckIndex(action.decks),
      deckLabels: buildDeckLabels(action.decks)
    };
  case 'addAutocompleteDeck':
    {
      let decks = state.ac.decks;
      decks.push({
        id: action.id,
        name: action.name,
        resource: action.resource
      });
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
      action.newDecks.forEach(newDeck => decks.push({
        id: newDeck.id,
        name: newDeck.name,
        resource: newDeck.resource
      }));
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

  case 'setCurrentDeckId': {
    return state;
  }
  case 'cacheDeck':
    {
      let newState = { ...state };
      newState.cache.deck[action.id] = action.newItem;
      return newState;
    }
  case 'setIdeas':
    let newState = {
      ...state,
      ideasLoaded: true,
      ideas: action.ideas
    };
    return newState;
  case 'setPublications':
    return {
      ...state,
      publicationsLoaded: true,
      publications: action.publications
    };
  case 'setPublication':
    {
      let newState = { ...state };
      updateListOfTitles(newState.publications, action.newItem);
      return newState;
    }
  case 'setPeople':
    action.people.forEach(addSortYear);
    return {
      ...state,
      peopleLoaded: true,
      people: action.people
    };
  case 'setPerson':
    {
      let newState = { ...state };
      newState.cache.deck[action.newItem.id] = action.newItem;
      updateListOfNames(newState.people, action.newItem);
      return newState;
    }
  case 'setEvents':
    action.events.forEach(addSortYear);
    return {
      ...state,
      eventsLoaded: true,
      events: action.events
    };
  case 'setEvent':
    {
      let newState = { ...state };
      updateListOfTitles(newState.events, action.newItem);
      return newState;
    }
  case 'setTimelines':
    return {
      ...state,
      timelinesLoaded: true,
      timelines: action.timelines
    };
  case 'setTimeline':
    {
      let newState = { ...state };
      updateListOfTitles(newState.timelines, action.newItem);
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
