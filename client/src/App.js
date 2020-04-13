import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch
} from 'react-router-dom';

import { initialState, reducer } from './AppState';
import { useStateValue, StateProvider } from './lib/state';

import Home from './components/Home';
import PrivateRoute from './components/PrivateRoute';

import Login from './components/Login';
import Logout from './components/Logout';

import Shell from './components/Shell';
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

import Event from './components/Event';
import Events from './components/Events';
import EventForm from './components/EventForm';

import Tag from './components/Tag';
import Tags from './components/Tags';
import TagForm from './components/TagForm';


export default function App({ user }) {
  let state = initialState;

  // update initial state with user
  //
  if (user) {
    state = reducer(state, {
      type: 'setUser',
      user
    });
  }

  return (
    <StateProvider initialState={state} reducer={reducer}>
      <AppUI/>
    </StateProvider>
  );
}

function AppUI() {
  const [state, dispatch] = useStateValue();

  function loggedStatus() {
    let status = '';

    let user = state.user;
    if (user) {
      status += user.username;
      if (user.admin) {
        status += ` (${user.admin.db_name})`;
      }
    } else {
      status = 'Login';
    }

    return status;
  }

  function loggedLink() {
    return state.user ? "/logout" : "/login";
  }

  function loginHandler(user) {
    dispatch({
      type: 'setUser',
      user
    });
  }

  function logoutHandler() {
    dispatch({
      type: 'setUser',
      user: undefined
    });
  }

  return (
    <Router>
      <div id='civil-app'>
        <div id='top-bar-menu'>
          <Link className='top-bar-menuitem' to={'/'}>Home</Link>
          <Link className='top-bar-menuitem' to={'/shell'}>Shell</Link>
          <Link className='top-bar-menuitem' to={'/dashboard'}>Dashboard</Link>
          <Link className='top-bar-menuitem' to={'/ideas'}>Ideas</Link>
          <Link className='top-bar-menuitem' to={'/tags'}>Tags</Link>
          <Link className='top-bar-menuitem' to={'/books'}>Books</Link>
          <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
          <Link className='top-bar-menuitem' to={'/people'}>People</Link>
          <Link className='top-bar-menuitem' to={'/events'}>Events</Link>
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

          <PrivateRoute path={'/shell'}>
            <Shell/>
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

          <PrivateRoute path={'/events/:id'}>
            <Event/>
          </PrivateRoute>
          <PrivateRoute exact path="/events">
            <Events/>
          </PrivateRoute>
          <PrivateRoute path={'/add-event'}>
            <EventForm/>
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
  );
}
