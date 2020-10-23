import { html, useState } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

function Login({ loginCallback }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'email') {
      setEmail(value);
    }
    if (name === 'password') {
      setPassword(value);
    }
  };

  const handleSubmit = (event) => {
    Net.post('api/auth', { email, password }).then(user => {
      loginCallback(user);
    });

    event.preventDefault();
  };

  return html`
    <section>
      <form onSubmit=${ handleSubmit }>
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
