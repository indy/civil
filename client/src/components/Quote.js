import React, { useState } from 'react';
import NoteUtils from '../lib/NoteUtils';

export default function Quote(props) {
  const [showMainButtons, setShowMainButtons] = useState(false);
  let   [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(props.quote.content);

  const handleTextAreaChangeEvent = (event) => {
    const target = event.target;
    const value = target.value;

    setContent(value);
  };

  const onDeleteClicked = (event) => {
    const onDelete = props.onDelete;
    const quote = props.quote;
    const id = quote.id;

    NoteUtils.deleteQuote(id);

    event.preventDefault();

    onDelete(id);
  };

  const hasQuoteBeenModified = () => {
    return content !== props.quote.content;
  };

  const onEditClicked = () => {
    isEditing = !isEditing;
    setIsEditing(isEditing);

    const quote = props.quote;
    const editedContent = content;

    if (isEditing === true) {
      // showEditButtons = true;
    } else {
      setShowMainButtons(false);

      // showEditButtons = false;
      if (hasQuoteBeenModified()) {

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
  };

  const onShowButtonsClicked = () => {
    setShowMainButtons(!showMainButtons);
  };

  const buildNonEditableContent = () => {
    return (
      <div onClick={ onShowButtonsClicked }>
        { content }
      </div>
    );
  };

  const buildEditableContent = () => {
    return (
      <textarea id="text"
                type="text"
                name="text"
                value={ content }
                onChange={ handleTextAreaChangeEvent }/>
    );
  };

  const buildEditLabelText = () => {
    if (isEditing === false) {
      return "Edit...";
    }

    if (hasQuoteBeenModified()) {
      // editing and have made changes
      return "Save Edits";
    }

    // editing and haven't made any changes yet
    return "Stop Editing";
  };

  const buildMainButtons = () => {
    return (
      <div>
        <button onClick={ (event) => { onDeleteClicked(event);} }>Delete</button>
        <button onClick={ onEditClicked }>{ buildEditLabelText() }</button>
      </div>
    );
  };

  return (
    <blockquote className="quote">
      { isEditing ? buildEditableContent() : buildNonEditableContent() }
      { showMainButtons && buildMainButtons() }
    </blockquote>
  );
}
