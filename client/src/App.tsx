import { h } from "preact";

import { Router, route, RouterOnChangeArgs } from "preact-router";
import { /*AppStateChange,*/ AppStateProvider, getAppState } from "./AppState";

import { IState } from "./types";

export const App = ({ state }: { state: IState }) => {
    return (
        <AppStateProvider state={state}>
            <AppUI />
        </AppStateProvider>
    );
};

const AppUI = () => {
    const state = getAppState();

    function handleRoute(e: RouterOnChangeArgs<Record<string, string | undefined> | null>): void {
        // isg reinstate
        // AppStateChange.routeChanged(e.url);

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
                <Router onChange={handleRoute}>
                </Router>
            </div>
        </div>
    );
};
