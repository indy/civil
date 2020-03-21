import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      redirectUrl: false
    };
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    this.setState({
      [name]: value
    });
  }

  handleSubmit = (event) => {
    const login_details = {
      email: this.state.email,
      password: this.state.password
    };

    Net.post('api/auth', login_details).then(resp => {
      this.setState({ redirectUrl: "/"});
    });

    event.preventDefault();
  }

  render() {
    const email = this.state.email;
    const password = this.state.password;
    const redirectUrl = this.state.redirectUrl;

    if (redirectUrl) {
      return <Redirect to={ redirectUrl } />;
    }

    return (
      <div>
        <section>
          <form onSubmit={ this.handleSubmit }>
            <label htmlFor="email">Email:</label>
            <input id="email"
                   type="text"
                   name="email"
                   value={ email }
                   onChange={ this.handleChangeEvent } />
            <label htmlFor="password">Password:</label>
            <input id="password"
                   type="password"
                   name="password"
                   value={ password }
                   onChange={ this.handleChangeEvent } />
            <input type="submit" value="Login"/>
          </form>
        </section>
      </div>
    );
  }
}

export default Login;
