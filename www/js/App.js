import { initialState, reducer, setUrlName } from '/js/AppState.js';
import { capitalise } from '/js/JsUtils.js';

import { html, Router, Route, Link, route } from '/lib/preact/mod.js';

import Net                              from '/js/Net.js';
import { useStateValue, StateProvider } from '/js/StateProvider.js';
import { augmentSettingsWithCssModifierParameters } from '/js/ColourCreator.js';

import SearchCommand           from '/js/components/SearchCommand.js';
import SpacedRepetition        from '/js/components/SpacedRepetition.js';
import Stats                   from '/js/components/Stats.js';
import { Idea, Ideas }         from '/js/components/Ideas.js';
import { Login, Logout }       from '/js/components/Login.js';
import { Person, People }      from '/js/components/People.js';
import { Article, Articles }   from '/js/components/Articles.js';
import { Timeline, Timelines } from '/js/components/Timelines.js';
import { Quote, Quotes }       from '/js/components/Quotes.js';

export async function buildInitialState(wasmInterface) {
    let state = initialState;

    state.wasmInterface = wasmInterface;
    state.uiColours = augmentSettingsWithCssModifierParameters(state.uiColours);

    let root = document.body;
    let hasPhysicalKeyboard = getComputedStyle(root).getPropertyValue("--has-physical-keyboard").trim();
    state.hasPhysicalKeyboard = hasPhysicalKeyboard === "true";

    try {
        // logged in
        let user = await Net.get("/api/users");

        if (user) {

            // update initial state with user
            //
            state.sigs.user.value = user;

            let uberSetupStruct = await getInitialStateForLoggedInUser();
            state = reducer(state, {
                type: 'uberSetup',
                ...uberSetupStruct
            });

            console.log('user is logged in');

            return state;
        } else {
            console.log('no user is logged in');
            return state;
        }
    } catch(err) {
        console.log('no user is logged in');
        return state;
    }
}

async function getInitialStateForLoggedInUser() {
    // let start = performance.now();
    let uber = await Net.get("/api/ubersetup");

    // let finish = performance.now();
    // console.log(`time new: ${ finish - start}`);

    return {
        imageDirectory: uber.directory,
        recentImages: uber.recentImages,
        srReviewCount: uber.srReviewCount,
        srEarliestReviewDate: uber.srEarliestReviewDate
    };
}

export function App(state) {
    return html`
    <${StateProvider} initialState=${state} reducer=${reducer}>
        <${AppUI}/>
    </${StateProvider}>`;
}

function TopBarMenu(props) {
    const [state, dispatch] = useStateValue();

    function loggedStatus() {
        let status = '';

        let user = state.sigs.user;
        if (user.value) {
            status += user.value.username;
            if (user.value.admin && user.value.admin.dbName !== "civil") {
                status += ` (${user.value.admin.dbName})`;
            }
        } else {
            status = 'Login';
        }

        return status;
    }

    function loggedLink() {
        return state.sigs.user.value ? "/logout" : "/login";
    }

    function clickedTopLevel(deckKind) {
        setUrlName(state, deckKind);
    }

    if (state.verboseUI) {
        return html`
        <nav>
            <div id="elastic-top-menu-items">
                ${state.preferredOrder.map(deckKind => html`
                    <div class="optional-navigable top-menu-decktype">
                        <${Link} class='pigment-${deckKind}'
                                 onclick=${ () => { clickedTopLevel(deckKind) } }
                                 href='/${deckKind}'>
                            ${capitalise(deckKind)}
                        </${Link}>
                    </div>`)}
                <div id="top-menu-sr">
                    <${Link} class='pigment-inherit' href='/sr'>SR(${state.srReviewCount})</${Link}>
                </div>
                <div>
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

        state.sigs.user.value = user;

        let struct = await getInitialStateForLoggedInUser();
        dispatch({
            type: 'uberSetup',
            ...struct,
        });
        route('/', true);

    }

    function handleRoute(e) {
        if (e.url !== '/login') {
            // only dispatch routeChanged when navigating to a top level page like /people, /ideas etc
            // (dms-update-deck will update the url when viewing any deck page)
            // this saves a redraw
            //
            if (state.preferredOrder.some(p => e.url === `/${p}`)) {
                dispatch({
                    type: 'routeChanged',
                    url: e.url
                });
            }

            // all other pages require the user to be logged in
            if (!state.sigs.user.value) {
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
            <${Stats} path="/stats"/>
            <${Ideas} path="/ideas"/>
            <${Idea} path="/ideas/:id"/>
            <${Articles} path="/articles"/>
            <${Article} path="/articles/:id"/>
            <${People} path="/people"/>
            <${Person} path="/people/:id"/>
            <${Timelines} path="/timelines"/>
            <${Timeline} path="/timelines/:id"/>
            <${Quotes} path="/quotes"/>
            <${Quote} path="/quotes/:id"/>
        </${Router}>
    </div>`;
}
