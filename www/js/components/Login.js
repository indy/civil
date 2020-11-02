import { html, useState } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

function Login({ loginCallback }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPassword2, setRegisterPassword2] = useState('');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    console.log(`${target} ${name} ${value}`);

    if (name === 'email') {
      setEmail(value);
    }
    if (name === 'password') {
      setPassword(value);
    }

    if (name === 'registeremail') {
      setRegisterEmail(value);
    }
    if (name === 'registerpassword') {
      setRegisterPassword(value);
    }

    if (name === 'registerpassword2') {
      setRegisterPassword2(value);
    }
  };

  const handleLoginSubmit = (event) => {
    Net.post('api/auth', { email, password }).then(user => {
      loginCallback(user);
    });

    event.preventDefault();
  };

  const handleRegisterSubmit = (event) => {
    Net.post('api/auth', { email, password }).then(user => {
      loginCallback(user);
    });

    event.preventDefault();
  };

  return html`
    <section>
      <h1>Login</h1>
      <form onSubmit=${ handleLoginSubmit }>
        <label for="email">Email:</label>
        <input id="email"
               type="text"
               name="email"
               value=${ email }
               onInput=${ handleChangeEvent } />
        <label for="password">Password:</label>
        <input id="password"
               type="password"
               name="password"
               value=${ password }
               onInput=${ handleChangeEvent } />
        <input type="submit" value="Login"/>
      </form>
      <h1>Register New User</h1>
      <form onSubmit=${ handleRegisterSubmit }>
        <label for="registeremail">Email:</label>
        <input id="registeremail"
               type="text"
               name="registeremail"
               value=${ registerEmail }
               onInput=${ handleChangeEvent } />
        <label for="registerpassword">Password:</label>
        <input id="registerpassword"
               type="password"
               name="registerpassword"
               value=${ registerPassword }
               onInput=${ handleChangeEvent } />
        <label for="registerpassword2">Confirm Password:</label>
        <input id="registerpassword2"
               type="password"
               name="registerpassword2"
               value=${ registerPassword2 }
               onInput=${ handleChangeEvent } />
        <input type="submit" value="Login"/>
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
