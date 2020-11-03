import { html, useState } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

function Login({ loginCallback }) {
  const [state, setState] = useState({
    'login-email': '',
    'login-password': '',
    'register-username': '',
    'register-magic-word': '',
    'register-email': '',
    'register-password': '',
    'register-password2': ''
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
        magic_word: state['register-magic-word']
      }).then(user => {
        loginCallback(user);
      });
    }

    event.preventDefault();
  };

  return html`
    <section>
      <h1>Login</h1>
      <form onSubmit=${ handleLoginSubmit }>
        <label for="login-email">Email:</label>
        <input id="login-email"
               type="text"
               name="login-email"
               value=${ state['login-email'] }
               onInput=${ handleChangeEvent } />
        <label for="login-password">Password:</label>
        <input id="login-password"
               type="password"
               name="login-password"
               value=${ state['login-password'] }
               onInput=${ handleChangeEvent } />
        <input type="submit" value="Login"/>
      </form>
      <h1>Register New User</h1>
      <form onSubmit=${ handleRegisterSubmit }>
        <label for="register-magic-word">Magic word that was given to you by Indy:</label>
        <input id="register-magic-word"
               type="text"
               name="register-magic-word"
               value=${ state['register-magic-word'] }
               onInput=${ handleChangeEvent } />
        <label for="register-username">Username:</label>
        <input id="register-username"
               type="text"
               name="register-username"
               value=${ state['register-username'] }
               onInput=${ handleChangeEvent } />
        <label for="register-email">Email:</label>
        <input id="register-email"
               type="text"
               name="register-email"
               value=${ state['register-email'] }
               onInput=${ handleChangeEvent } />
        <label for="register-password">Password:</label>
        <input id="register-password"
               type="password"
               name="register-password"
               value=${ state['register-password'] }
               onInput=${ handleChangeEvent } />
        <label for="register-password-2">Confirm Password:</label>
        <input id="register-password-2"
               type="password"
               name="register-password-2"
               value=${ state['register-password-2'] }
               onInput=${ handleChangeEvent } />
        <input type="submit" value="Register" disabled=${!okToSendRegistration()}/>
      </form>
    </section>`;
}

function Logout({ logoutCallback }) {
  const handleLogout = (event) => {
    Net.delete('api/auth', {}).then(() => {
      logoutCallback();
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
