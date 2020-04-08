export const initialState = {
  user: undefined,
  // when a user is logged in:
  // user: {
  //   username: ...
  //   email: ...
  // },

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

  pointsLoaded: false,
  points: [],
  point: {},

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
  case 'loadAutocomplete':
    return {
      ...state,
      acLoaded: true,
      ac: {
        tags: action.tags,
        decks: action.decks
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
      updateListOfTitles(newState.ideas, action.idea);
      newState.idea[action.id] = action.idea;
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
      updateListOfTitles(newState.books, action.book);
      newState.book[action.id] = action.book;
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
      updateListOfTitles(newState.articles, action.article);
      newState.article[action.id] = action.article;
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
      updateListOfNames(newState.people, action.person);
      newState.person[action.id] = action.person;
      return newState;
    }
  case 'setPoints':
    return {
      ...state,
      pointsLoaded: true,
      points: action.points
    };
  case 'setPoint':
    {
      let newState = { ...state };
      updateListOfTitles(newState.points, action.point);
      newState.point[action.id] = action.point;
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
      updateListOfNames(newState.tags, action.tag);
      newState.tag[action.id] = action.tag;
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