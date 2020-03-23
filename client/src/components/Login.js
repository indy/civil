import React, { useState } from 'react';
import { useHistory, useLocation} from 'react-router-dom';
import Net from '../lib/Net';

export default function Login(props) {
  let history = useHistory();
  let location = useLocation();

  let { from } = location.state || { from: { pathname: "/" } };

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
    Net.post('api/auth', { email, password}).then(user => {
      props.loginCallback(user);
      history.replace(from);
    });

    event.preventDefault();
  };

  return (
    <div>
      <section>
        <form onSubmit={ handleSubmit }>
          <label htmlFor="email">Email:</label>
          <input id="email"
                 type="text"
                 name="email"
                 value={ email }
                 onChange={ handleChangeEvent } />
          <label htmlFor="password">Password:</label>
          <input id="password"
                 type="password"
                 name="password"
                 value={ password }
                 onChange={ handleChangeEvent } />
          <input type="submit" value="Login"/>
        </form>
      </section>
    </div>
  );
}
