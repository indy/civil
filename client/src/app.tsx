import { h } from "preact";
import { Link, Router, route, RouterOnChangeArgs } from "preact-router";

import { State, User, UberSetup } from "types";

import Net from "utils/net";
import { AppStateChange, AppStateProvider, getAppState } from "app-state";
import { capitalise } from "utils/js";

import SearchCommand from "features/search-command";
import SpacedRepetition from "pages/spaced-repetition";
import Stuff from "pages/stuff";
import { Article, Articles } from "pages/articles";
import { DeluxeToolbar } from "features/deluxe-toolbar";
import { Ideas, Idea } from "pages/ideas";
import { Login, Logout } from "pages/login";
import { Person, People } from "pages/people";
import { Quote, Quotes } from "pages/quotes";
import { Timeline, Timelines } from "pages/timelines";

export const App = ({ state }: { state: State }) => {
    return (
        <AppStateProvider state={state}>
            <AppUI />
        </AppStateProvider>
    );
};

function DebugMessages() {
    const appState = getAppState();

    function render(msg: string) {
        return <div>{msg}</div>;
    }

    return (
        <div class="debug-messages">
            {appState.debugMessages.value.map(render)}
        </div>
    );
}

function TopBarMenu() {
    const appState = getAppState();

    function loggedStatus() {
        let status = "";

        let user = appState.user;
        if (user.value) {
            status += user.value.username;
            if (user.value.admin && user.value.admin.dbName !== "civil") {
                status += ` (${user.value.admin.dbName})`;
            }
        } else {
            status = "Login";
        }

        return status;
    }

    function loggedLink() {
        return appState.user.value ? "/logout" : "/login";
    }

    function clickedTopLevel(topMenuItem: string) {
        AppStateChange.urlTitle(topMenuItem);
    }

    if (appState.verboseUI.value) {
        return (
            <nav>
                <div id="elastic-top-menu-items">
                    {appState.preferredOrder.map((topMenuItem) => (
                        <div class="optional-navigable top-menu-decktype">
                            <Link
                                class={`pigment-${topMenuItem}`}
                                onClick={() => {
                                    clickedTopLevel(topMenuItem);
                                }}
                                href={`/${topMenuItem}`}
                            >
                                {capitalise(topMenuItem)}
                            </Link>
                        </div>
                    ))}

                    <div id="top-menu-sr">
                        <Link class="pigment-inherit" href="/sr">
                            SR({appState.srReviewCount.value})
                        </Link>
                    </div>
                    <div>
                        <Link class="pigment-inherit" href={loggedLink()}>
                            {loggedStatus()}
                        </Link>
                    </div>
                </div>
            </nav>
        );
    } else {
        return <div></div>;
    }
}

const AppUI = () => {
    const state = getAppState();

    function loginHandler(user: User) {
        AppStateChange.userLogin(user);

        Net.get<UberSetup>("/api/ubersetup").then((uber) => {
            AppStateChange.uberSetup(uber);
            route("/", true);
        });
    }

    function handleRoute(
        e: RouterOnChangeArgs<Record<string, string | undefined> | null>
    ): void {
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
            } else if (e.url === "/") {
                setTimeout(() => route("/ideas", true), 0);
            }
        }
    }

    return (
        <div id="civil-app">
            <DebugMessages />
            <SearchCommand />
            <TopBarMenu />
            <DeluxeToolbar />
            <Router onChange={handleRoute}>
                <Login path="/login" loginCallback={loginHandler} />
                <Logout path="/logout" />
                <SpacedRepetition path="/sr" />
                <Stuff path="/stuff" />
                <Ideas path="/ideas" />
                <Idea path="/ideas/:id" />
                <Articles path="/articles" />
                <Article path="/articles/:id" />
                <People path="/people" />
                <Person path="/people/:id" />
                <Timelines path="/timelines" />
                <Timeline path="/timelines/:id" />
                <Quotes path="/quotes" />
                <Quote path="/quotes/:id" />
            </Router>
        </div>
    );
};
