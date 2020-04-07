import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch,
  Redirect
} from 'react-router-dom';

import { StateProvider } from './state';

import Login from './components/Login';
import Logout from './components/Logout';

import Dashboard from './components/Dashboard';

import Person from './components/Person';
import People from './components/People';
import PersonForm from './components/PersonForm';

import Article from './components/Article';
import Articles from './components/Articles';
import ArticleForm from './components/ArticleForm';

import Book from './components/Book';
import Books from './components/Books';
import BookForm from './components/BookForm';

import Idea from './components/Idea';
import Ideas from './components/Ideas';
import IdeaForm from './components/IdeaForm';

import Point from './components/Point';
import Points from './components/Points';
import PointForm from './components/PointForm';

import Tag from './components/Tag';
import Tags from './components/Tags';
import TagForm from './components/TagForm';


import { useStateValue } from './state';
import {ensureAC} from './lib/appUtils';


const CivilAuthGlobal = {
  isAuthenticated: false
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

export default function App(props) {

  const initialState = {
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

  const reducer = (state, action) => {
    switch (action.type) {
    case 'loadAutocomplete':
      console.log(action.tags);
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

  const [username, setUsername] = useState(props.user.username);
  const [isAuthenticated, setIsAuthenticated] = useState(props.user.username !== '');

  CivilAuthGlobal.isAuthenticated = isAuthenticated;

  useEffect(() => {
    CivilAuthGlobal.isAuthenticated = isAuthenticated;
  });

  function loggedStatus() {
    return isAuthenticated ? username : 'Login';
  }

  function loggedLink() {
    return isAuthenticated ? "/logout" : "/login";
  }

  function loginHandler(user) {
    setUsername(user.username);
    setIsAuthenticated(true);
  }

  function logoutHandler() {
    setIsAuthenticated(false);
  }

  return (
    <StateProvider initialState={initialState} reducer={reducer}>
      <Router>
        <div>
          <div id='top-bar-menu'>
            <Link className='top-bar-menuitem' to={'/'}>Home</Link>
            <Link className='top-bar-menuitem' to={'/dashboard'}>Dashboard</Link>
            <Link className='top-bar-menuitem' to={'/ideas'}>Ideas</Link>
            <Link className='top-bar-menuitem' to={'/tags'}>Tags</Link>
            <Link className='top-bar-menuitem' to={'/books'}>Books</Link>
            <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
            <Link className='top-bar-menuitem' to={'/people'}>People</Link>
            <Link className='top-bar-menuitem' to={'/points'}>Points</Link>
            <Link className='top-bar-menuitem' to={ loggedLink() } id="login-menuitem">{ loggedStatus() }</Link>
          </div>
          <hr/>
          <Switch>

            <Route exact path="/">
              <Home/>
            </Route>
            <Route exact path="/login">
              <Login loginCallback = { loginHandler }/>
            </Route>
            <PrivateRoute exact path="/logout">
              <Logout logoutCallback = { logoutHandler }/>
            </PrivateRoute>

            <PrivateRoute path={'/dashboard'}>
              <Dashboard/>
            </PrivateRoute>

            <PrivateRoute path={'/ideas/:id'}>
              <Idea/>
            </PrivateRoute>
            <PrivateRoute exact path="/ideas">
              <Ideas/>
            </PrivateRoute>
            <PrivateRoute path={'/add-idea'}>
              <IdeaForm/>
            </PrivateRoute>

            <PrivateRoute path={'/people/:id'}>
              <Person/>
            </PrivateRoute>
            <PrivateRoute exact path="/people">
              <People/>
            </PrivateRoute>
            <PrivateRoute path={'/add-person'}>
              <PersonForm/>
            </PrivateRoute>

            <PrivateRoute path={'/points/:id'}>
              <Point/>
            </PrivateRoute>
            <PrivateRoute exact path="/points">
              <Points/>
            </PrivateRoute>
            <PrivateRoute path={'/add-point'}>
              <PointForm/>
            </PrivateRoute>

            <PrivateRoute path={'/articles/:id'}>
              <Article/>
            </PrivateRoute>
            <PrivateRoute exact path="/articles">
              <Articles/>
            </PrivateRoute>
            <PrivateRoute path={'/add-article'}>
              <ArticleForm/>
            </PrivateRoute>

            <PrivateRoute path={'/books/:id'}>
              <Book/>
            </PrivateRoute>
            <PrivateRoute exact path="/books">
              <Books/>
            </PrivateRoute>
            <PrivateRoute path={'/add-book'}>
              <BookForm/>
            </PrivateRoute>

            <PrivateRoute path={'/tags/:id'}>
              <Tag/>
            </PrivateRoute>
            <PrivateRoute exact path="/tags">
              <Tags/>
            </PrivateRoute>
            <PrivateRoute path={'/add-tag'}>
              <TagForm/>
            </PrivateRoute>

          </Switch>
        </div>
      </Router>
    </StateProvider>
  );
}

const Home = () => {
  const [state, dispatch] = useStateValue();
  ensureAC(state, dispatch);

  return (
    <div>
      <h1>Civil &times; Zettelkasten &times; Samizdat</h1>
      <ol>
        <li>Keep private</li>
        <li>Remain honest</li>
        <li>Never delete</li>
      </ol>
      <img src="/img/BertrandRussell-Illustration-1024x1022.png" alt="Bertrand Russell"/>
    </div>
  );
};

function PrivateRoute({ children, ...rest }) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        CivilAuthGlobal.isAuthenticated ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location }
            }}
          />
        )
      }
    />
  );
}
