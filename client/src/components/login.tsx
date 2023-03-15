import { h } from "preact";
import { useState, useRef } from "preact/hooks";

import { route } from "preact-router";

import { User } from "types";

import Net from "net";
import { AppStateChange, getAppState } from "app-state";

type Props = {
    path?: string;
    loginCallback: (_: User) => void;
};

function Login({ path, loginCallback }: Props) {
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

    const emailRef = useRef(null);
    const passwordRef = useRef(null);

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
        if (
            emailRef &&
            emailRef.current &&
            passwordRef &&
            passwordRef.current
        ) {
            // get the email and password using refs rather than local state
            // this is because there might be browser password managers
            // that auto-fill the login fields

            let ec = emailRef.current as HTMLInputElement;
            let pc = passwordRef.current as HTMLInputElement;

            let email: string = ec.value.trim();
            let password: string = pc.value.trim();

            Net.post<IAuthData, User>("api/auth", {
                email,
                password,
            })
                .then((user) => {
                    loginCallback(user);
                })
                .catch((e) => {
                    console.log(e);
                    setState({
                        ...state,
                        errorMessage: "Unable to login",
                    });
                });
        }
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
            Net.post<IRegisterData, User>("api/users", {
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
                    ref={emailRef}
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
                    ref={passwordRef}
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
