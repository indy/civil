import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

class PersonCreateForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      age: '',
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

  handleCivilDateChange = (id, date) => {
    const update = {
      [id]: date
    };
    this.setState((prevState, props) => update);
  }

  handleCivilLocationChange = (id, location) => {
    const update = {
      [id]: location
    };
    this.setState((prevState, props) => update);
  }

  handleSubmit = (event) => {
    let sendState = Object.assign({}, this.state);
    const cleanState = StateUtils.removeEmptyObjects(sendState);

    if (!cleanState.birth_date || !cleanState.birth_location) {
      console.error("a person requires both birth date and birth location information");
    } else {
      const data = JSON.stringify(cleanState);
      Net.createThenRedirect(this, "people", data);
    }

    event.preventDefault();
  }

  render() {
    const {
      name,
      age,
      redirectUrl
    } = this.state;

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

            <fieldset>
              <legend>Born</legend>
              <CivilDate id="birth_date" onDateChange={this.handleCivilDateChange}/>
              <br/>
              <CivilLocation id="birth_location" onLocationChange={this.handleCivilLocationChange}/>
            </fieldset>

            <fieldset>
              <legend>Died</legend>
              <CivilDate id="death_date" onDateChange={this.handleCivilDateChange}/>
              <br/>
              <CivilLocation id="death_location" onLocationChange={this.handleCivilLocationChange}/>
            </fieldset>

            <label htmlFor="age">Age:</label>
            <input id="age"
                   type="text"
                   name="age"
                   value={ age }
                   onChange={ this.handleChangeEvent } />

            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}

export default PersonCreateForm;
