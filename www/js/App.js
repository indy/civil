import { initialState, reducer } from '/js/AppState.js';

import { html, Router, Route, Link, route } from '/lib/preact/mod.js';

import Net                              from '/js/Net.js';
import { WasmInterfaceProvider }        from '/js/WasmInterfaceProvider.js';
import { useStateValue, StateProvider } from '/js/StateProvider.js';

import Search                        from '/js/components/Search.js';
import { Idea, Ideas }               from '/js/components/Ideas.js';
import { Login, Logout }             from '/js/components/Login.js';
import { Person, People }            from '/js/components/People.js';
import { Publication, Publications } from '/js/components/Publications.js';
import { Timeline, Timelines }       from '/js/components/Timelines.js';

export async function buildInitialState() {
  try {
    // logged in
    let user = await Net.get("/api/users");

    // update initial state with user
    //
    let state = reducer(initialState, {
      type: 'setUser',
      user
    });

    let struct = await getInitialStateForLoggedInUser();
    state = reducer(state, {
      type: 'uberSetup',
      ...struct
    });

    console.log('user is logged in');
    return state;

  } catch(err) {
    console.log('no user is logged in');
    return initialState;
  }
}

async function getInitialStateForLoggedInUser() {
  // this is _really_ not good - 5 trips to the server before a logged in user's page begins rendering
  let imageDirectory = await Net.get("/api/upload/directory");
  let recentImages = await Net.get("/api/upload");
  let autocompleteDecks = await Net.get("/api/autocomplete");
  let graphResponse = await Net.get("/api/cmd/graph");
  let graphConnections = graphResponse.results;

  return {
    imageDirectory,
    recentImages,
    autocompleteDecks,
    graphConnections
  };
}

export function App(state, wasmInterface) {
  return html`
    <${WasmInterfaceProvider} wasmInterface=${wasmInterface}>
      <${StateProvider} initialState=${state} reducer=${reducer}>
          <${AppUI}/>
      </${StateProvider}>
    </${WasmInterfaceProvider}>
  `;
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

  return html`
    <div id='top-bar-menu'>
      <${Link} class='top-bar-menuitem' href=${'/'}>Search</${Link}>
      <${Link} class='top-bar-menuitem' href=${'/ideas'}>Ideas</${Link}>
      <${Link} class='top-bar-menuitem' href=${'/publications'}>Publications</${Link}>
      <${Link} class='top-bar-menuitem' href=${'/people'}>People</${Link}>
      <${Link} class='top-bar-menuitem' href=${'/timelines'}>Timelines</${Link}>
      <${Link} class='top-bar-menuitem' href=${ loggedLink() } id="login-menuitem">${ loggedStatus() }</${Link}>
    </div>
`;
}

function AppUI(props) {
  const [state, dispatch] = useStateValue();

  async function loginHandler(user) {
    console.log(user);

    dispatch({
      type: 'setUser',
      user
    });

    let struct = await getInitialStateForLoggedInUser();
    dispatch({
      type: 'uberSetup',
      ...struct,
    });
    route('/', true);

  }

  function logoutHandler() {
    dispatch({
      type: 'setUser',
      user: undefined
    });
    route('/login', true);
  }

  function handleRoute(e) {
    if (e.url !== '/login') {
      // all other pages require the user to be logged in
      if (!state.user) {
        route('/login', true);
      }
    }
  }

  return html`
    <div id='civil-app'>
      <${TopBarMenu}/>
      <${Router} onChange=${ handleRoute }>
        <${Login} path="/login" loginCallback=${ loginHandler }/>
        <${Logout} path="/logout" logoutCallback=${ logoutHandler }/>
        <${Search} path="/"/>
        <${Ideas} path="/ideas"/>
        <${Idea} path="/ideas/:id"/>
        <${Publications} path="/publications"/>
        <${Publication} path="/publications/:id"/>
        <${People} path="/people"/>
        <${Person} path="/people/:id"/>
        <${Timelines} path="/timelines"/>
        <${Timeline} path="/timelines/:id"/>
      </${Router}>
    </div>`;
}
