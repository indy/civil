import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

import CivilDate from './CivilDate';
import CivilLocation from './CivilLocation';

class PointCreateForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      title: '',
      redirectUrl: false,
    };
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    const update = {
      [name]: value
    };

    this.setState((prevState, props) => update);
  }

  handleCivilDateChange = (id, date) => {
    const update = {
      date: date
    };
    this.setState((prevState, props) => update);
  }

  handleCivilLocationChange = (id, location) => {
    const update = {
      location: location
    };
    this.setState((prevState, props) => update);
  }

  handleSubmit = (event) => {
    const cleanState = StateUtils.removeEmptyObjects(this.state);
    const data = JSON.stringify(cleanState);
    // console.log(`sending: ${data}`);
    Net.createThenRedirect(this, "points", data);
    event.preventDefault();
  }

  render() {
    const {
      title,
      redirectUrl
    } = this.state;

    if (redirectUrl) {
      return <Redirect to={ redirectUrl } />;
    }

    return (
      <article>
        <section>
          <form onSubmit={ this.handleSubmit }>
            <div>
              <label htmlFor="title">Title:</label>
              <input id="title"
                     type="text"
                     name="title"
                     value={ title }
                     autoComplete="off"
                     onChange={ this.handleChangeEvent } />
            </div>
            <br/>
            <CivilDate id="point-date" onDateChange={this.handleCivilDateChange}/>
            <br/>
            <CivilLocation id="point-location" onLocationChange={this.handleCivilLocationChange}/>
            <br/>
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}

export default PointCreateForm;
