import { h } from "preact";
import { Router, route, RouterOnChangeArgs } from "preact-router";

import { State, User, UberSetup } from "types";

import { AppStateChange, AppStateProvider, getAppState } from "app-state";

import Net from "shared/net";

import Previewer from "components/previewer";
import Bookmarks from "components/bookmarks";
import CommandBar from "components/command-bar";
import { DeluxeToolbar } from "components/deluxe-toolbar";

import AccountSettings from "components/page-account-settings";
import BusyIndicator from "components/busy-indicator";
import FrontPage from "components/page-front-page";
import Login from "components/page-login";
import Memorise from "components/page-memorise";
import { Article, Articles } from "components/page-articles";
import { Dialogue, DialogueChat, Dialogues } from "components/page-dialogues";
import { Ideas, Idea } from "components/page-ideas";
import { Person, People } from "components/page-people";
import { Quote, Quotes } from "components/page-quotes";
import { Timeline, Timelines } from "components/page-timelines";

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

    // {appState.componentRequiresFullKeyboardAccess.value ? "taken" : "free"}

    return (
        <div class="c-debug-messages">
            {appState.debugMessages.value.map(render)}
        </div>
    );
}

const AppUI = () => {
    const state = getAppState();

    function loginHandler(user: User) {
        AppStateChange.userLogin({ user });

        Net.get<UberSetup>("/api/ubersetup").then((uber) => {
            AppStateChange.uberSetup({ uber });
            route("/", true);
        });
    }

    function handleRoute(
        e: RouterOnChangeArgs<Record<string, string | undefined> | null>
    ): void {
        AppStateChange.routeChanged({ url: e.url });

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
            <BusyIndicator />
            <DebugMessages />
            <Bookmarks />
            <CommandBar />
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
