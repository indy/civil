import React from 'react';
import { useHistory } from 'react-router-dom';

import Net from '../lib/Net';

export default function Logout(props) {
  let history = useHistory();

  const handleLogout = (event) => {
    Net.delete('api/auth', {}).then(() => {
      props.logoutCallback();
      history.push("/");
    });
    event.preventDefault();
  };

  return (
    <div>
      <section>
        <form onSubmit={ handleLogout }>
          <input type="submit" value="Logout"/>
        </form>
      </section>
    </div>
  );
}
