import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch
} from 'react-router-dom';

import { initialState, reducer } from './AppState';
import { useStateValue, StateProvider } from './lib/state';

import Shell from './components/Shell';
import PrivateRoute from './components/PrivateRoute';

import Login from './components/Login';
import Logout from './components/Logout';

import Person from './components/Person';
import People from './components/People';

import Publication from './components/Publication';
import Publications from './components/Publications';

import Idea from './components/Idea';
import Ideas from './components/Ideas';

import Event from './components/Event';
import Events from './components/Events';

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

  let welcomes = ["Civil",
                  "Civilised Noteboxes",
                  "Zivilisiert Zettelkästen",
                  "πολιτισμένο σημειωματάριο",
                  "nota civilis arca archa",
                  "ਸਭਿਆਚਾਰਕ ਨੋਟਬਾਕਸ",
                  "문명화 된 메모 상자",
                  "文明ノートボックス",
                  "cuadro civilizado",
                  "цивилизованный блокнот",
                  "цивилизирана кутија за белешки",
                  "Ersatz Verstand"]; // replacement mind where replacement is not as good
  let welcome = welcomes[Math.floor(Math.random() * welcomes.length)];

  let msgs = ["We organise our worlds by first organising ourselves - Jean Piaget"];
  console.log(msgs[0]);

  // display a welcome message on the console
  //
  state = reducer(state, {
    type: 'pushStdout',
    message: (
      <div>
        <h1>{ welcome }</h1>
        <ol>
          <li>Remain Honest</li>
          <li>Keep Private</li>
          <li>Never Delete</li>
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
      <Link className='top-bar-menuitem' to={'/publications'}>Publications</Link>
      <Link className='top-bar-menuitem' to={'/people'}>People</Link>
      <Link className='top-bar-menuitem' to={'/events'}>Events</Link>
      <Link className='top-bar-menuitem' to={ loggedLink() } id="login-menuitem">{ loggedStatus() }</Link>
    </div>);
}

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
          <PrivateRoute path={'/publications/:id'}>
            <Publication/>
          </PrivateRoute>
          <PrivateRoute exact path="/publications">
            <Publications/>
          </PrivateRoute>
        </Switch>
      </div>
    </Router>
  );
}
