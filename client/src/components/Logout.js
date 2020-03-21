import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

class Logout extends Component {
  constructor(props) {
    super(props);

    this.state = {
      redirectUrl: false
    };
  }

  handleLogout = (event) => {
    Net.delete('api/auth', {}).then(resp => {
      this.setState({ redirectUrl: "/"});
    });

    event.preventDefault();
  }

  render() {
    const redirectUrl = this.state.redirectUrl;

    if (redirectUrl) {
      return <Redirect to={ redirectUrl } />;
    }

    return (
      <div>
        <section>
          <form onSubmit={ this.handleLogout }>
            <input type="submit" value="Logout"/>
          </form>
        </section>
      </div>
    );
  }
}

export default Logout;
