import { h } from '/js/ext/preact.module.js';
import htm from '/js/ext/htm.js';
import { useState } from '/js/ext/hooks.module.js';

import Net from '/js/lib/Net.js';

function Login({ loginCallback }) {
  const html = htm.bind(h);
  //let history = useHistory();
  //let location = useLocation();

  // let { from } = location.state || { from: { pathname: "/" } };

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
      // history.replace(from);
    });

    event.preventDefault();
  };

  return html`
    <section>
      <form onSubmit=${ handleSubmit }>
        <label htmlFor="email">Email:</label>
        <input id="email"
               type="text"
               name="email"
               value=${ email }
               onInput=${ handleChangeEvent } />
        <label htmlFor="password">Password:</label>
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
  const html = htm.bind(h);
  //let history = useHistory();

  const handleLogout = (event) => {
    Net.delete('api/auth', {}).then(() => {
      logoutCallback();
      // history.push("/");
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
