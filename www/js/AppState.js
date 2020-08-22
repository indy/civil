import { addSortYear } from '/js/lib/eras.js';

export const initialState = {
  user: undefined,
  // when a user is logged in:
  // user: {
  //   username: ...
  //   email: ...
  // },

  console: {
    stdout: [],
    history: [],
    historyPosition: null,
    previousHistoryPosition: null,
    processing: false,
    promptLabel: '->'
  },

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
};

export const reducer = (state, action) => {
  switch (action.type) {
  case 'setUser':
    return {
      ...state,
      user: action.user
    };
  case 'pushStdout':
    {
      let c = { ...state.console };
      c.stdout.push(action.message);

      if (action.rawInput) {
        // Only supplied if history is enabled
        c.history.push(action.rawInput);
        c.historyPosition = null;
      }

      return {
        ...state,
        console: c
      };
    }
  case 'clearStdout':
    {
      let c = {
        ...state.console,
        stdout: [],
        historyPosition: null
      };

      return {
        ...state,
        console: c
      };
    }
  case 'clearInput':
    {
      let c = {
        ...state.console,
        historyPosition: null
      };

      return {
        ...state,
        console: c
      };
    }
  case 'setPromptLabel':
    {
      let c = {
        ...state.console,
        promptLabel: action.promptLabel
      };
      return {
        ...state,
        console: c
      };
    }
  case 'scrollHistory':
    {
      let c = {
        ...state.console,
        historyPosition: action.historyPosition,
        previousHistoryPosition: action.previousHistoryPosition
      };

      return {
        ...state,
        console: c
      };
    }
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
      //      updateListOfTitles(newState.ideas, action.newItem);
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

function buildFullGraph(graphConnections) {
  let res = {};

  for (let i = 0; i < graphConnections.length; i += 3) {
    let fromDeck = graphConnections[i + 0];
    let toDeck = graphConnections[i + 1];
    let strength = graphConnections[i + 2];

    if (!res[fromDeck]) {
      res[fromDeck] = new Set();
    }
    res[fromDeck].add([toDeck, strength]);

    if (!res[toDeck]) {
      res[toDeck] = new Set();
    }
    res[toDeck].add([fromDeck, -strength]);
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
