import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import Net from '../lib/Net';

class SubjectCreateForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      redirectUrl: false
    };
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    this.setState({
      name: value
    });
  }

  handleSubmit = (event) => {
    const data = JSON.stringify(this.state);
    Net.createThenRedirect(this, "subject", data);
    event.preventDefault();
  }

  render() {
    const name = this.state.name;
    const redirectUrl = this.state.redirectUrl;

    if (redirectUrl) {
      return <Redirect to={ redirectUrl } />;
    }

    return (
      <article>
        <section>
          <form onSubmit={ this.handleSubmit }>

            <label htmlFor="name">Name:</label>
            <input id="name"
                   type="text"
                   name="name"
                   value={ name }
                   autoComplete="off"
                   onChange={ this.handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}

export default SubjectCreateForm;
