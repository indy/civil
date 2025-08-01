import { route } from "preact-router";
import { useRef, useState } from "preact/hooks";

import type { UserWithUiConfig } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import Net from "../shared/net";

import CivilInput from "./civil-input";
import { CivContainer, CivForm, CivLeftLabel, CivMain } from "./civil-layout";

type Props = {
    path?: string;
    loginCallback: (_: UserWithUiConfig) => void;
};

export default function Login({ path, loginCallback }: Props) {
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

            Net.post<IAuthData, UserWithUiConfig>("api/auth", {
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

    type RegisterData = {
        username: string;
        email: string;
        password: string;
        uiConfig: string;
        magicWord: string;
    };

    function handleRegisterSubmit(event: Event) {
        if (okToSendRegistration()) {
            console.log("handleRegisterSubmit");
            let obj = {
                username: state["register-username"],
                email: state["register-email"],
                password: state["register-password"],
                uiConfig: JSON.stringify(appState.uiConfig.value),
                magicWord: state["register-magic-word"],
            };
            Net.post<RegisterData, UserWithUiConfig>("api/users", obj).then(
                (user) => {
                    loginCallback(user);
                },
            );
        }

        event.preventDefault();
    }

    function onContentChange(value: string, name: string) {
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

    function obtainKeyboard(event: Event) {
        event.preventDefault();
        AppStateChange.obtainKeyboard();
    }

    function relinquishKeyboard(event: Event) {
        event.preventDefault();
        AppStateChange.relinquishKeyboard();
    }

    return (
        <section>
            <CivContainer>
                <CivMain>
                    <h1 class="vertical-spacer ui">Login</h1>
                </CivMain>

                <CivForm onSubmit={handleLoginSubmit}>
                    <CivLeftLabel forId="login-email">Email</CivLeftLabel>
                    <CivMain>
                        <input
                            id="login-email"
                            type="text"
                            name="login-email"
                            value={state["login-email"]}
                            onInput={handleChangeEvent}
                            onFocus={obtainKeyboard}
                            onBlur={relinquishKeyboard}
                            ref={emailRef}
                        />
                    </CivMain>

                    <CivLeftLabel forId="login-password">Password</CivLeftLabel>

                    <CivMain>
                        <input
                            id="login-password"
                            type="password"
                            name="login-password"
                            value={state["login-password"]}
                            onInput={handleChangeEvent}
                            onFocus={obtainKeyboard}
                            onBlur={relinquishKeyboard}
                            ref={passwordRef}
                        />
                    </CivMain>

                    <CivMain>
                        <input type="submit" value="Login" />
                        <div>{state.errorMessage}</div>
                    </CivMain>
                </CivForm>

                <CivMain>
                    <h1 class="ui">Register New User</h1>
                </CivMain>

                <CivForm onSubmit={handleRegisterSubmit}>
                    <CivLeftLabel forId="register-magic-word">
                        Magic Word
                    </CivLeftLabel>
                    <CivMain>
                        <CivilInput
                            id="register-magic-word"
                            value={state["register-magic-word"]}
                            onContentChange={onContentChange}
                        />
                    </CivMain>

                    <CivLeftLabel forId="register-username">
                        Username
                    </CivLeftLabel>

                    <CivMain>
                        <CivilInput
                            id="register-username"
                            value={state["register-username"]}
                            onContentChange={onContentChange}
                        />
                    </CivMain>

                    <CivLeftLabel forId="register-email">Email</CivLeftLabel>
                    <CivMain>
                        <CivilInput
                            id="register-email"
                            value={state["register-email"]}
                            onContentChange={onContentChange}
                        />
                    </CivMain>

                    <CivLeftLabel forId="register-password">
                        Password
                    </CivLeftLabel>
                    <CivMain>
                        <input
                            id="register-password"
                            type="password"
                            name="register-password"
                            value={state["register-password"]}
                            onFocus={obtainKeyboard}
                            onBlur={relinquishKeyboard}
                            onInput={handleChangeEvent}
                        />
                    </CivMain>

                    <CivLeftLabel forId="register-password-2">
                        Confirm Password
                    </CivLeftLabel>
                    <CivMain>
                        <input
                            id="register-password-2"
                            type="password"
                            name="register-password-2"
                            value={state["register-password-2"]}
                            onFocus={obtainKeyboard}
                            onBlur={relinquishKeyboard}
                            onInput={handleChangeEvent}
                        />
                    </CivMain>
                    <CivMain>
                        <input
                            type="submit"
                            value="Register"
                            disabled={!okToSendRegistration()}
                        />
                    </CivMain>
                </CivForm>
            </CivContainer>
        </section>
    );
}
