import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

class ArticleCreateForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      title: '',
      source: '',
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
    const cleaned_state = StateUtils.removeEmptyStrings(this.state, ["source"]);
    const data = JSON.stringify(cleaned_state);
    Net.createThenRedirect(this, "article", data);
    event.preventDefault();
  }

  render() {
    const title = this.state.title;
    const source = this.state.source;
    const redirectUrl = this.state.redirectUrl;

    if (redirectUrl) {
      return <Redirect to={ redirectUrl } />;
    }

    return (
      <article>
        <section>
          <form onSubmit={ this.handleSubmit }>

            <label htmlFor="title">Title:</label>
            <input id="title"
                   type="text"
                   name="title"
                   value={ title }
                   onChange={ this.handleChangeEvent } />
            <label htmlFor="source">Source:</label>
            <input id="source"
                   type="text"
                   name="source"
                   value={ source }
                   onChange={ this.handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}

export default ArticleCreateForm;
