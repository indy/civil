import { html, route, useState } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';

import Net from '/js/Net.js';

function Login({ loginCallback}) {
    const [appState, dispatch] = useStateValue();

    if (appState.user) {
        route('/', true);
    };

    const [state, setState] = useState({
        'login-email': '',
        'login-password': '',
        'register-username': '',
        'register-magic-word': '',
        'register-email': '',
        'register-password': '',
        'register-password2': '',
        errorMessage: ''
    });

    const handleChangeEvent = (event) => {
        const target = event.target;
        const name = target.name;
        const value = target.value;

        const newState = { ...state };
        newState[name] = value;
        setState(newState);
    };

    function handleLoginSubmit(event) {
        Net.post('api/auth', {
            email: state['login-email'],
            password: state['login-password']
        }).then(user => {
            loginCallback(user);
        }).catch(err => {
            setState({
                ...state,
                errorMessage: "Unable to login"
            })
        });

        event.preventDefault();
    };

    function okToSendRegistration() {
        return state['register-username'].length > 0 &&
            state['register-email'].length > 0 &&
            state['register-magic-word'].length > 0 &&
            state['register-password'].length > 0 &&
            state['register-password'] === state['register-password-2'];
    }

    function handleRegisterSubmit(event) {
        if (okToSendRegistration()) {
            Net.post('api/users', {
                username: state['register-username'],
                email: state['register-email'],
                password: state['register-password'],
                magicWord: state['register-magic-word']
            }).then(user => {
                loginCallback(user);
            });
        }

        event.preventDefault();
    };

    return html`
    <section>
        <h1 class="login-title ui">Login</h1>
        <form class="login-form" onSubmit=${ handleLoginSubmit }>
            <label class="login-label" for="login-email">Email:</label>
            <input class="login-input" id="login-email"
                   type="text"
                   name="login-email"
                   value=${ state['login-email'] }
                   onInput=${ handleChangeEvent } />
            <label class="login-label" for="login-password">Password:</label>
            <input class="login-input" id="login-password"
                   type="password"
                   name="login-password"
                   value=${ state['login-password'] }
                   onInput=${ handleChangeEvent } />
            <input class="login-button" type="submit" value="Login"/>
            <div class="login-error-message">${state.errorMessage}</div>
        </form>
        <h1 class="ui">Register New User</h1>
        <form class="login-form" onSubmit=${ handleRegisterSubmit }>
            <label class="login-label" for="register-magic-word">Magic Word:</label>
            <input class="login-input" id="register-magic-word"
                   type="text"
                   name="register-magic-word"
                   value=${ state['register-magic-word'] }
                   onInput=${ handleChangeEvent } />
            <label class="login-label" for="register-username">Username:</label>
            <input class="login-input" id="register-username"
                   type="text"
                   name="register-username"
                   value=${ state['register-username'] }
                   onInput=${ handleChangeEvent } />
            <label class="login-label" for="register-email">Email:</label>
            <input class="login-input" id="register-email"
                   type="text"
                   name="register-email"
                   value=${ state['register-email'] }
                   onInput=${ handleChangeEvent } />
            <label class="login-label" for="register-password">Password:</label>
            <input class="login-input" id="register-password"
                   type="password"
                   name="register-password"
                   value=${ state['register-password'] }
                   onInput=${ handleChangeEvent } />
            <label class="login-label" for="register-password-2">Confirm Password:</label>
            <input class="login-input" id="register-password-2"
                   type="password"
                   name="register-password-2"
                   value=${ state['register-password-2'] }
                   onInput=${ handleChangeEvent } />
            <input class="login-button" type="submit" value="Register" disabled=${!okToSendRegistration()}/>
        </form>
    </section>`;
}

function Logout() {
    const [state, dispatch] = useStateValue();

    const handleLogout = (event) => {
        Net.delete('api/auth', {}).then(() => {
            //// this isn't logging out the user, refreshing the app logs the user back in
            dispatch({
                type: 'setUser',
                user: undefined
            });
            route('/login', true);
        });
        event.preventDefault();
    };

    return html`
    <section>
        <form onSubmit=${ handleLogout }>
            <input type="submit" value="Logout"/>
        </form>
    </section>
`;
}

export { Login, Logout };
