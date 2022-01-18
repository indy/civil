import { initialState, reducer } from '/js/AppState.js';
import { capitalise } from '/js/JsUtils.js';

import { html, Router, Route, Link, route } from '/lib/preact/mod.js';

import Net                              from '/js/Net.js';
import { WasmInterfaceProvider }        from '/js/WasmInterfaceProvider.js';
import { useStateValue, StateProvider } from '/js/StateProvider.js';

import SearchCommand                 from '/js/components/SearchCommand.js';
import SpacedRepetition              from '/js/components/SpacedRepetition.js';
import { Idea, Ideas }               from '/js/components/Ideas.js';
import { Login, Logout }             from '/js/components/Login.js';
import { Person, People }            from '/js/components/People.js';
import { Article, Articles } from '/js/components/Articles.js';
import { Timeline, Timelines }       from '/js/components/Timelines.js';
import { WhenWritableToggle }        from '/js/components/WhenWritable.js';

export async function buildInitialState() {
  try {
    // logged in
    let user = await Net.get("/api/users");

    if (user) {

      // update initial state with user
      //
      let state = reducer(initialState, {
        type: 'setUser',
        user
      });

      let uberSetupStruct = await getInitialStateForLoggedInUser();
      state = reducer(state, {
        type: 'uberSetup',
        ...uberSetupStruct
      });

      // set the app to be read only on small devices
      //
      let smallScreen = window.matchMedia("(max-width: 500px)");
      state = reducer(state, {
        type: 'setLock',
        readOnly: smallScreen.matches
      });

      console.log('user is logged in');

      return state;
    } else {
      console.log('no user is logged in');
      return initialState;
    }
  } catch(err) {
    console.log('no user is logged in');
    return initialState;
  }
}

async function getInitialStateForLoggedInUser() {
  // let start = performance.now();
  let uber = await Net.get("/api/ubersetup");

  // let finish = performance.now();
  // console.log(`time new: ${ finish - start}`);

  return {
    imageDirectory: uber.directory,
    recentImages: uber.recent_images,
    srReviewCount: uber.sr_review_count,
    srEarliestReviewDate: uber.sr_earliest_review_date
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
      if (user.admin && user.admin.db_name !== "civil") {
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

  if (state.showTopMenu) {
    return html`
      <nav>
        <div id="elastic-top-menu-items">
          ${state.preferredOrder.map(dk => html`<div class="optional-navigable top-menu-decktype">
        <${Link} class='pigment-${dk}' href='/${dk}'>${capitalise(dk)}</${Link}>
        </div>`)}
          <div id="top-menu-sr">
            <${Link} class='pigment-inherit' href='/sr'>SR(${state.srReviewCount})</${Link}>
          </div>
          <div>
            <${WhenWritableToggle}/>
            <${Link} class='pigment-inherit' href=${ loggedLink() }>${ loggedStatus() }</${Link}>
          </div>
        </div>
      </nav>`;
  } else {
    return html``;
  }
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

  function handleRoute(e) {
    if (e.url !== '/login') {
      // all other pages require the user to be logged in
      if (!state.user) {
        route('/login', true);
      } else if (e.url === '/') {
        route('/ideas', true);
      }
    }
  }

  return html`
    <div id='civil-app'>
      <${SearchCommand}/>
      <${TopBarMenu}/>
      <${Router} onChange=${ handleRoute }>
        <${Login} path="/login" loginCallback=${ loginHandler }/>
        <${Logout} path="/logout"/>
        <${SpacedRepetition} path="/sr"/>
        <${Ideas} path="/ideas"/>
        <${Idea} path="/ideas/:id"/>
        <${Articles} path="/articles"/>
        <${Article} path="/articles/:id"/>
        <${People} path="/people"/>
        <${Person} path="/people/:id"/>
        <${Timelines} path="/timelines"/>
        <${Timeline} path="/timelines/:id"/>
      </${Router}>
    </div>`;
}
