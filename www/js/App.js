import { AppStateChange, initialState } from '/js/AppState.js';
import { capitalise } from '/js/JsUtils.js';

import { html, Router, Route, Link, route, useEffect } from '/lib/preact/mod.js';

import Net                              from '/js/Net.js';
import { useAppState, AppStateProvider } from '/js/AppStateProvider.js';
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

export function App(state) {
    return html`
    <${AppStateProvider} state=${state}>
        <${AppUI}/>
    </${AppStateProvider}>`;
}

function TopBarMenu(props) {
    const appState = useAppState();

    function loggedStatus() {
        let status = '';

        let user = appState.user;
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
        return appState.user.value ? "/logout" : "/login";
    }

    function clickedTopLevel(deckKind) {
        AppStateChange.urlName(deckKind);
    }

    if (appState.verboseUI.value) {
        return html`
        <nav>
            <div id="elastic-top-menu-items">
                ${appState.preferredOrder.map(deckKind => html`
                    <div class="optional-navigable top-menu-decktype">
                        <${Link} class='pigment-${deckKind}'
                                 onclick=${ () => { clickedTopLevel(deckKind) } }
                                 href='/${deckKind}'>
                            ${capitalise(deckKind)}
                        </${Link}>
                    </div>`)}
                <div id="top-menu-sr">
                    <${Link} class='pigment-inherit' href='/sr'>SR(${appState.srReviewCount.value})</${Link}>
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
    const appState = useAppState();

    function loginHandler(user) {
        appState.user.value = user;

        Net.get("/api/ubersetup").then(uber => {
            AppStateChange.uberSetup(uber);
            route('/', true);
        });
    }

    function handleRoute(e) {
        if (e.url !== '/login') {
            if (appState.preferredOrder.some(p => e.url === `/${p}`)) {
                AppStateChange.routeChanged(e.url);
            }

            // all other pages require the user to be logged in
            if (!appState.user.value) {
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
