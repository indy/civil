import { h } from "preact";
import { useState } from "preact/hooks";
import { route } from "preact-router";
import { AppStateChange, getAppState } from "../AppState";

import { IUser } from "../types";

import Net from "../Net";

function Login({ path, loginCallback }: { path?: string; loginCallback: any }) {
    const appState = getAppState();

    if (appState.user.value.username !== "") {
        route("/", true);
    }

    const [state, setState] = useState({
        "login-email": "",
        "login-password": "",
        "register-username": "",
        "register-magic-word": "",
        "register-email": "",
        "register-password": "",
        "register-password-2": "",
        errorMessage: "",
    });

    const handleChangeEvent = (event: Event) => {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value = target.value;

            const newState = { ...state };
            // crappy code to please typescript type-checking
            //
            if (name === "login-email") {
                newState["login-email"] = value;
            } else if (name === "login-password") {
                newState["login-password"] = value;
            } else if (name === "register-username") {
                newState["register-username"] = value;
            } else if (name === "register-magic-word") {
                newState["register-magic-word"] = value;
            } else if (name === "register-email") {
                newState["register-email"] = value;
            } else if (name === "register-password") {
                newState["register-password"] = value;
            } else if (name === "register-password-2") {
                newState["register-password-2"] = value;
            }

            setState(newState);
        }
    };

    interface IAuthData {
        email: string;
        password: string;
    }
    interface IRegisterData {
        username: string;
        email: string;
        password: string;
        magic_word: string;
    }

    function handleLoginSubmit(event: Event) {
        Net.post<IAuthData, IUser>("api/auth", {
            email: state["login-email"],
            password: state["login-password"],
        })
            .then((user) => {
                loginCallback(user);
            })
            .catch(() => {
                setState({
                    ...state,
                    errorMessage: "Unable to login",
                });
            });

        event.preventDefault();
    }

    function okToSendRegistration() {
        return (
            state["register-username"].length > 0 &&
            state["register-email"].length > 0 &&
            state["register-magic-word"].length > 0 &&
            state["register-password"].length > 0 &&
            state["register-password"] === state["register-password-2"]
        );
    }

    function handleRegisterSubmit(event: Event) {
        if (okToSendRegistration()) {
            Net.post<IRegisterData, IUser>("api/users", {
                username: state["register-username"],
                email: state["register-email"],
                password: state["register-password"],
                magic_word: state["register-magic-word"],
            }).then((user) => {
                loginCallback(user);
            });
        }

        event.preventDefault();
    }

    return (
        <section>
            <h1 class="login-title ui">Login</h1>
            <form class="login-form" onSubmit={handleLoginSubmit}>
                <label class="login-label" for="login-email">
                    Email:
                </label>
                <input
                    class="login-input"
                    id="login-email"
                    type="text"
                    name="login-email"
                    value={state["login-email"]}
                    onInput={handleChangeEvent}
                />
                <label class="login-label" for="login-password">
                    Password:
                </label>
                <input
                    class="login-input"
                    id="login-password"
                    type="password"
                    name="login-password"
                    value={state["login-password"]}
                    onInput={handleChangeEvent}
                />
                <input class="login-button" type="submit" value="Login" />
                <div class="login-error-message">{state.errorMessage}</div>
            </form>
            <h1 class="ui">Register New User</h1>
            <form class="login-form" onSubmit={handleRegisterSubmit}>
                <label class="login-label" for="register-magic-word">
                    Magic Word:
                </label>
                <input
                    class="login-input"
                    id="register-magic-word"
                    type="text"
                    name="register-magic-word"
                    value={state["register-magic-word"]}
                    onInput={handleChangeEvent}
                />
                <label class="login-label" for="register-username">
                    Username:
                </label>
                <input
                    class="login-input"
                    id="register-username"
                    type="text"
                    name="register-username"
                    value={state["register-username"]}
                    onInput={handleChangeEvent}
                />
                <label class="login-label" for="register-email">
                    Email:
                </label>
                <input
                    class="login-input"
                    id="register-email"
                    type="text"
                    name="register-email"
                    value={state["register-email"]}
                    onInput={handleChangeEvent}
                />
                <label class="login-label" for="register-password">
                    Password:
                </label>
                <input
                    class="login-input"
                    id="register-password"
                    type="password"
                    name="register-password"
                    value={state["register-password"]}
                    onInput={handleChangeEvent}
                />
                <label class="login-label" for="register-password-2">
                    Confirm Password:
                </label>
                <input
                    class="login-input"
                    id="register-password-2"
                    type="password"
                    name="register-password-2"
                    value={state["register-password-2"]}
                    onInput={handleChangeEvent}
                />
                <input
                    class="login-button"
                    type="submit"
                    value="Register"
                    disabled={!okToSendRegistration()}
                />
            </form>
        </section>
    );
}

function Logout({ path }: { path?: string }) {
    const handleLogout = (event: Event) => {
        Net.delete("api/auth", {}).then(() => {
            //// this isn't logging out the user, refreshing the app logs the user back in
            AppStateChange.userLogout();
            route("/login", true);
        });
        event.preventDefault();
    };

    return (
        <section>
            <form onSubmit={handleLogout}>
                <input type="submit" value="Logout" />
            </form>
        </section>
    );
}

export { Login, Logout };
