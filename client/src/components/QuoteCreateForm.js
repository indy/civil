import React, { Component } from 'react';

class QuoteCreateForm extends Component {
  constructor (props) {
    super(props);

    this.state = {
      content: "",
      source: ""
    };
  }

  handleChangeEvent = (event) => {
    const target = event.target;
    // console.log(`setting ${target.name} to ${target.value}`);
    this.setState({
      [target.name]: target.value
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();
    this.props.onSubmit(event);
  }

  render() {
    return (
      <form onSubmit={ this.handleSubmit }>

        <label htmlFor="content">Quote:</label>
        <textarea id="content"
                  type="text"
                  name="content"
                  value={ this.state.content }
                  onChange={ this.handleChangeEvent }
                  />

        <label htmlFor="source">Source:</label>
        <input id="source"
               type="text"
               name="source"
               value={ this.state.source }
               onChange={ this.handleChangeEvent }
               />

        <input type="submit" value="Save quote"/>
      </form>
    );
  }
}

export default QuoteCreateForm;
