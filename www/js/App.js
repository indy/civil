import { initialState, reducer } from '/js/AppState.js';

import { html, Router, Route, Link, route } from '/js/ext/library.js';

import Net                              from '/js/lib/Net.js';
import { WasmInterfaceProvider }        from '/js/lib/WasmInterfaceProvider.js';
import { useStateValue, StateProvider } from '/js/lib/StateProvider.js';

import Console                       from '/js/components/Console.js';
import Search                        from '/js/components/Search.js';
import { Event, Events }             from '/js/components/Events.js';
import { Idea, Ideas }               from '/js/components/Ideas.js';
import { Login, Logout }             from '/js/components/Login.js';
import { Person, People }            from '/js/components/People.js';
import { Publication, Publications } from '/js/components/Publications.js';

export default function App({ user, wasmInterface, autocompleteDecks, graphConnections }) {
  let state = initialState;

  // update initial state with user
  //
  if (user) {
    state = reducer(state, {
      type: 'setUser',
      user
    });

    if (autocompleteDecks) {
      console.log('populating autocomplete at startup');
      state = reducer(state, {
        type: 'loadAutocomplete',
        decks: autocompleteDecks
      });
    }

    if (graphConnections) {
      state = reducer(state, {
        type: 'loadFullGraph',
        graphConnections
      });
    }
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

  // display a welcome message on the console
  state = reducer(state, {
    type: 'pushStdout',
    message: html`
     <div>
        <h1>${ welcome }</h1>
        <ol>
          <li>Remain Honest</li>
          <li>Keep Private</li>
          <li>Never Delete</li>
        </ol>
        <p>type !help</p>
      </div>`
  });

  return html`
    <${WasmInterfaceProvider} wasmInterface=${wasmInterface}>
      <${StateProvider} initialState=${state} reducer=${reducer}>
          <${AppUI}/>
      </${StateProvider}>
    </${WasmInterfaceProvider}>
  `;
};

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
      <${Link} activeClassName="active" class='top-bar-menuitem' href=${'/'}>Search</${Link}>
      <${Link} activeClassName="active" class='top-bar-menuitem' href=${'/ideas'}>Ideas</${Link}>
      <${Link} activeClassName="active" class='top-bar-menuitem' href=${'/publications'}>Publications</${Link}>
      <${Link} activeClassName="active" class='top-bar-menuitem' href=${'/people'}>People</${Link}>
      <${Link} activeClassName="active" class='top-bar-menuitem' href=${'/events'}>Events</${Link}>
      <${Link} activeClassName="active" class='top-bar-menuitem' href=${ loggedLink() } id="login-menuitem">${ loggedStatus() }</${Link}>
    </div>
`;
}

function AppUI(props) {
  const [state, dispatch] = useStateValue();
  if (state.dummy) {}

  function loginHandler(user) {
    dispatch({
      type: 'setUser',
      user
    });

    Net.get('/api/autocomplete').then(decks => {
      dispatch({
        type: 'loadAutocomplete',
        decks
      });
    });

    Net.get('/api/cmd/graph').then(graphResponse => {
      dispatch({
        type: 'loadConnectivity',
        connectivity: graphResponse.results
      });
    });

  }

  function logoutHandler() {
    dispatch({
      type: 'setUser',
      user: undefined
    });
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
        <${Events} path="/events"/>
        <${Event} path="/events/:id"/>
      </${Router}>
      <${Console}/>
    </div>`;
}
