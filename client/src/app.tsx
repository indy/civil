import { h } from "preact";
import { Link, Router, route, RouterOnChangeArgs } from "preact-router";

import { State, User, UberSetup, WaitingFor } from "types";

import { AppStateChange, AppStateProvider, getAppState } from "app-state";

import Net from "utils/net";
import { capitalise } from "utils/js";

import Previewer from "components/previewer";
import ScratchList from "components/scratch-list";
import CommandBar from "components/command-bar";
import { DeluxeToolbar } from "components/deluxe-toolbar";

import AccountSettings from "pages/account-settings";
import FrontPage from "pages/front-page";
import Login from "pages/login";
import Memorise from "pages/memorise";
import { Article, Articles } from "pages/articles";
import { Dialogue, DialogueChat, Dialogues } from "pages/dialogues";
import { Ideas, Idea } from "pages/ideas";
import { Person, People } from "pages/people";
import { Quote, Quotes } from "pages/quotes";
import { Timeline, Timelines } from "pages/timelines";

import { svgClock } from "components/svg-loaders";

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

function WaitingDisplay() {
    const appState = getAppState();

    const show = appState.waitingFor.value === WaitingFor.Server;

    let classes = "waiting-for";
    if (show) {
        classes += " waiting-for-active";
    }

    return <div class={classes}>{show && svgClock()}</div>;
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
        return appState.user.value ? "/account-settings" : "/login";
    }

    function clickedTopLevel(topMenuItem: string) {
        AppStateChange.urlTitle(topMenuItem);
    }

    function menuItemText(topMenuItem: string): string {
        if (topMenuItem === "memorise") {
            return `Memorise(${appState.memoriseReviewCount.value})`;
        } else {
            return capitalise(topMenuItem);
        }
    }

    function menuItemClass(topMenuItem: string): string {
        if (
            topMenuItem === "memorise" &&
            appState.memoriseReviewCount.value > 0
        ) {
            return `pigment-${topMenuItem}-active`;
        } else {
            return `pigment-${topMenuItem}`;
        }
    }

    return (
        <nav>
            <div id="elastic-top-menu-items">
                {appState.preferredOrder.map((topMenuItem) => (
                    <div class="optional-navigable top-menu-item">
                        <Link
                            class={menuItemClass(topMenuItem)}
                            onClick={() => {
                                clickedTopLevel(topMenuItem);
                            }}
                            href={`/${topMenuItem}`}
                        >
                            {menuItemText(topMenuItem)}
                        </Link>
                    </div>
                ))}

                <div>
                    <Link class="pigment-inherit" href={loggedLink()}>
                        {loggedStatus()}
                    </Link>
                </div>
            </div>
        </nav>
    );
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
                // setTimeout(() => route("/ideas", true), 0);
            }
        }
    }

    return (
        <div id="civil-app">
            <WaitingDisplay />
            <DebugMessages />
            <ScratchList />
            <CommandBar />
            <TopBarMenu />
            <DeluxeToolbar />
            <Previewer />
            <Router onChange={handleRoute}>
                <FrontPage path="/" />
                <Login path="/login" loginCallback={loginHandler} />
                <AccountSettings path="/account-settings" />
                <Memorise path="/memorise" />
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
                <Dialogues path="/dialogues" />
                <Dialogue path="/dialogues/:id" />
                <DialogueChat path="/dialogues/chat" />
            </Router>
        </div>
    );
};
