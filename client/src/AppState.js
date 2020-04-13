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
    tags: [],
    decks: []
  },

  ideasLoaded: false,
  ideas: [],                  // when listing ideas on /ideas page
  idea: {},                   // an object where keys are the idea ids, values are the ideas

  booksLoaded: false,
  books: [],
  book: {},

  articlesLoaded: false,
  articles: [],
  article: {},

  peopleLoaded: false,
  people: [],
  person: {},

  eventsLoaded: false,
  events: [],
  event: {},

  tagsLoaded: false,
  tags: [],
  tag: {}
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
        tags: action.tags,
        decks: action.decks
      }
    };
  case 'addAutocompleteDeck':
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
        tags: state.ac.tags,
        decks: decks
      }
    };
  case 'addAutocompleteTags':
    let tags = state.ac.tags;
    action.tags.forEach(tag => {
      tags.push(tag);
    });
    tags.sort((a, b) => a.value > b.value);
    return {
      ...state,
      ac: {
        tags: tags,
        decks: state.ac.decks
      }
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
      updateListOfTitles(newState.ideas, action.newItem);
      newState.idea[action.id] = action.newItem;
      return newState;
    }
  case 'setBooks':
    return {
      ...state,
      booksLoaded: true,
      books: action.books
    };
  case 'setBook':
    {
      let newState = { ...state };
      updateListOfTitles(newState.books, action.newItem);
      newState.book[action.id] = action.newItem;
      return newState;
    }
  case 'setArticles':
    return {
      ...state,
      articlesLoaded: true,
      articles: action.articles
    };
  case 'setArticle':
    {
      let newState = { ...state };
      updateListOfTitles(newState.articles, action.newItem);
      newState.article[action.id] = action.newItem;
      return newState;
    }
  case 'setPeople':
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
  case 'setTags':
    return {
      ...state,
      tagsLoaded: true,
      tags: action.tags
    };
  case 'setTag':
    {
      let newState = { ...state };
      updateListOfNames(newState.tags, action.newItem);
      newState.tag[action.id] = action.newItem;
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
