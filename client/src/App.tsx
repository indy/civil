import { h } from "preact";
import { Link, Router, route, RouterOnChangeArgs } from "preact-router";

import { capitalise } from './JsUtils';

import { AppStateChange, AppStateProvider, getAppState } from "./AppState";
import Net from "./Net.js";

import { IState, IUser, IUberSetup } from "./types";

import { Login, Logout }       from './components/Login';

export const App = ({ state }: { state: IState }) => {
    return (
        <AppStateProvider state={state}>
            <AppUI />
        </AppStateProvider>
    );
};

function TopBarMenu() {
    const appState = getAppState();

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

    function clickedTopLevel(deckKind: string) {
        AppStateChange.urlName(deckKind);
    }

    if (appState.verboseUI.value) {
        return (
        <nav>
            <div id="elastic-top-menu-items">

                {appState.preferredOrder.map(deckKind =>
                    <div class="optional-navigable top-menu-decktype">
                        <Link class={`pigment-${deckKind}`}
                              onClick={ () => { clickedTopLevel(deckKind) } }
                              href={`/${deckKind}`}>
                            {capitalise(deckKind)}
                        </Link>
                    </div>)}

                <div id="top-menu-sr">
                    <Link class='pigment-inherit' href='/sr'>SR({appState.srReviewCount.value})</Link>
                </div>
                <div>
                    <Link class='pigment-inherit' href={ loggedLink() }>{ loggedStatus() }</Link>
                </div>
            </div>
        </nav>);
    } else {
        return <div></div>;
    }
}

const AppUI = () => {
    const state = getAppState();

    function loginHandler(user: IUser) {
        AppStateChange.userLogin(user);

        Net.get<IUberSetup>("/api/ubersetup").then(uber => {
            AppStateChange.uberSetup(uber);
            route('/', true);
        });
    }


    function handleRoute(e: RouterOnChangeArgs<Record<string, string | undefined> | null>): void {
        AppStateChange.routeChanged(e.url);

        if (e.url !== "/login") {
            // all other pages require the user to be logged in
            if (state.user.value.username === "") {
                console.log(
                    "redirecting to /login because user is not logged in"
                );

                // NOTE: this is a hack to work-around a bug in preact-router
                // in which a call to route during the initial render is ignored
                // see https://github.com/preactjs/preact-router/issues/417
                // once that issue is fixed the setTimeout can be replaced
                // with a normal function call to 'route'
                setTimeout(() => route("/login", true), 0);
                // route("/login", true);
            }
        }
    }

    return (
        <div id="memo-app">
            <div id="app-content">
                <TopBarMenu/>
                <Router onChange={handleRoute}>
                    <Login path="/login" loginCallback={ loginHandler }/>
                    <Logout path="/logout"/>
                </Router>
            </div>
        </div>
    );
};
