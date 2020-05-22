import { addSortYear } from './lib/eras';

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
    // an array of { id, name, label } objects (having both name and label is redundent)
    decks: []
  },
  // an array based on ac.decks which is indexed by id
  deckLabels: [],

  fullGraphLoaded: false,
  fullGraph: [],


  // caching (redo this)
  //
  ideasLoaded: false,
  ideas: [],                  // when listing ideas on /ideas page
  idea: {},                   // an object where keys are the idea ids, values are the ideas

  publicationsLoaded: false,
  publications: [],
  publication: {},

  peopleLoaded: false,
  people: [],
  person: {},

  eventsLoaded: false,
  events: [],
  event: {}
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
      deckLabels: buildDeckLabels(action.decks)
    };
  case 'addAutocompleteDeck':
    {
      let decks = state.ac.decks;
      decks.push({
        id: action.id,
        value: action.value,
        label: action.label
      });
      decks.sort((a, b) => a.value > b.value);
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
      action.newDecks.forEach(newDeck => decks.push(newDeck));
      decks.sort((a, b) => a.value > b.value);
      return {
        ...state,
        ac: {
          decks: decks
        }
      };
    }
  case 'loadFullGraph':
    return {
      ...state,
      fullGraphLoaded: true,
      fullGraph: buildFullGraph(action.graphConnections)
    };
  case 'setIdeas':
    return {
      ...state,
      ideasLoaded: true,
      ideas: action.ideas
    };
  case 'setIdea':
    {
      let newState = { ...state };
      //      updateListOfTitles(newState.ideas, action.newItem);
      newState.idea[action.id] = action.newItem;
      return newState;
    }
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
      newState.publication[action.id] = action.newItem;
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
      newState.person[action.id] = action.newItem;
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
      newState.event[action.id] = action.newItem;
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
      res[fromDeck] = [];
    }
    res[fromDeck].push([toDeck, strength]);
  }

  return res;
}

function buildDeckLabels(decks) {
  let res = [];

  decks.forEach(d => {
    res[d.id] = d.label;
  });

  return res;
}
