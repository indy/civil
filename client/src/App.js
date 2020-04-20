import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch
  // useLocation
} from 'react-router-dom';

import { initialState, reducer } from './AppState';
import { useStateValue, StateProvider } from './lib/state';

import Shell from './components/Shell';
import PrivateRoute from './components/PrivateRoute';

import Login from './components/Login';
import Logout from './components/Logout';

import Person from './components/Person';
import People from './components/People';

import Article from './components/Article';
import Articles from './components/Articles';

import Book from './components/Book';
import Books from './components/Books';

import Idea from './components/Idea';
import Ideas from './components/Ideas';

import Event from './components/Event';
import Events from './components/Events';

import Tag from './components/Tag';
import Tags from './components/Tags';

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

  // display a welcome message on the console
  //
  state = reducer(state, {
    type: 'pushStdout',
    message: (
        <div>
          <h1>Civil &times; Zettelkasten &times; Samizdat</h1>
          <ol>
            <li>Keep private</li>
            <li>Remain honest</li>
            <li>Never delete</li>
          </ol>
        </div>
      )
  });

  return (
    <StateProvider initialState={state} reducer={reducer}>
      <AppUI/>
    </StateProvider>
  );
}


function TopBarMenu(props) {
  // let location = useLocation();
  const [state] = useStateValue();

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


  return (
    <div id='top-bar-menu'>
      <Link className='top-bar-menuitem' to={'/'}>Home</Link>
      <Link className='top-bar-menuitem' to={'/ideas'}>Ideas</Link>
      <Link className='top-bar-menuitem' to={'/tags'}>Tags</Link>
      <Link className='top-bar-menuitem' to={'/books'}>Books</Link>
      <Link className='top-bar-menuitem' to={'/articles'}>Articles</Link>
      <Link className='top-bar-menuitem' to={'/people'}>People</Link>
      <Link className='top-bar-menuitem' to={'/events'}>Events</Link>
      <Link className='top-bar-menuitem' to={ loggedLink() } id="login-menuitem">{ loggedStatus() }</Link>
    </div>);
}

/*
    <div id='top-bar-menu'>
      { location.pathname === '/' ? <span className="camouflage">.</span> : <Link className='top-bar-menuitem' to={'/'}>Shell</Link>}
      <Link className='top-bar-menuitem' to={ loggedLink() } id="login-menuitem">{ loggedStatus() }</Link>
    </div>
*/

function AppUI(props) {
  const [state, dispatch] = useStateValue();
  if (state.dummy) {}

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
        <TopBarMenu/>
        <Switch>
          <Route exact path="/">
            <Shell/>
          </Route>
          <Route exact path="/login">
            <Login loginCallback = { loginHandler }/>
          </Route>
          <PrivateRoute exact path="/logout">
            <Logout logoutCallback = { logoutHandler }/>
          </PrivateRoute>
          <PrivateRoute path={'/ideas/:id'}>
            <Idea/>
          </PrivateRoute>
          <PrivateRoute exact path="/ideas">
            <Ideas/>
          </PrivateRoute>
          <PrivateRoute path={'/people/:id'}>
            <Person/>
          </PrivateRoute>
          <PrivateRoute exact path="/people">
            <People/>
          </PrivateRoute>
          <PrivateRoute path={'/events/:id'}>
            <Event/>
          </PrivateRoute>
          <PrivateRoute exact path="/events">
            <Events/>
          </PrivateRoute>
          <PrivateRoute path={'/articles/:id'}>
            <Article/>
          </PrivateRoute>
          <PrivateRoute exact path="/articles">
            <Articles/>
          </PrivateRoute>
          <PrivateRoute path={'/books/:id'}>
            <Book/>
          </PrivateRoute>
          <PrivateRoute exact path="/books">
            <Books/>
          </PrivateRoute>
          <PrivateRoute path={'/tags/:id'}>
            <Tag/>
          </PrivateRoute>
          <PrivateRoute exact path="/tags">
            <Tags/>
          </PrivateRoute>
        </Switch>
      </div>
    </Router>
  );
}
