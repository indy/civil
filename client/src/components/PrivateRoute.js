import React from 'react';
import { Route, Redirect } from 'react-router-dom';

import { useStateValue } from '../lib/state';

export default function PrivateRoute({ children, ...rest }) {
  const [state] = useStateValue();

  return (
    <Route
      {...rest}
      render={({ location }) =>
        state.user ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location }
            }}
          />
        )
      }
    />
  );
}
