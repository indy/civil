import React, { Component } from 'react';
import NoteUtils from '../lib/NoteUtils';

class Quote extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showMainButtons: false,
      isEditing: false,
      content: props.quote.content
    };
  }

  handleTextAreaChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    this.setState({ content: value });
  }

  onDeleteClicked = (event) => {
    const onDelete = this.props.onDelete;
    const quote = this.props.quote;
    const id = quote.id;

    NoteUtils.deleteQuote(id);

    event.preventDefault();

    onDelete(id);
  }

  hasQuoteBeenModified = (state, props) => {
    return state.content !== props.quote.content;
  }

  onEditClicked = () => {
    this.setState((prevState, props) => {
      const isEditing = !prevState.isEditing;
      const quote = props.quote;
      const editedContent = prevState.content;

      let showMainButtons = prevState.showMainButtons;

      if (isEditing === true) {
        // showEditButtons = true;
      } else {
        showMainButtons = false;
        // showEditButtons = false;
        if (this.hasQuoteBeenModified(prevState, props)) {

          const id = quote.id;
          const data = {
            content: editedContent
          };

          // send updated content to server
          //
          NoteUtils.editQuote(id, data);

          // stopped editing and the editable content is different than
          // the original note's text.
          props.onEdited(quote.id, data);
        }
      }

      return {
        isEditing: isEditing,
        showMainButtons: showMainButtons
      };
    });
  }

  onShowButtonsClicked = () => {
    this.setState((prevState, props) => ({
      showMainButtons: !prevState.showMainButtons
    }));
  }

  buildNonEditableContent = () => {
    return (
      <div onClick={ this.onShowButtonsClicked }>
        { this.state.content }
      </div>
    );
  }

  buildEditableContent = () => {
    return (
      <textarea id="text"
                type="text"
                name="text"
                value={ this.state.content }
                onChange={ this.handleTextAreaChangeEvent }/>
    );
  }

  buildEditLabelText = () => {
    if (this.state.isEditing === false) {
      return "Edit...";
    }

    if (this.hasQuoteBeenModified(this.state, this.props)) {
      // editing and have made changes
      return "Save Edits";
    }

    // editing and haven't made any changes yet
    return "Stop Editing";
  }

  buildMainButtons = () => {
    return (
      <div>
        <button onClick={ (event) => { this.onDeleteClicked(event);} }>Delete</button>
        <button onClick={ this.onEditClicked }>{ this.buildEditLabelText() }</button>
      </div>
    );
  }

  render() {
    return (
      <blockquote className="quote">
        { this.state.isEditing ? this.buildEditableContent() : this.buildNonEditableContent() }
        { this.state.showMainButtons && this.buildMainButtons() }
      </blockquote>
    );
  }
}

export default Quote;
