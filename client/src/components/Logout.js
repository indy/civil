import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

export default function Logout(props) {
  const [redirectUrl, setRedirectUtl] = useState(false);

  const handleLogout = (event) => {
    Net.delete('api/auth', {}).then(() => setRedirectUtl("/"));
    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
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
}
