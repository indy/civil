import React, { useState } from 'react';

export default function NoteCreateForm(props) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [separator, setSeparator] = useState('separator');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'content') {
      setContent(value);
    } else if (name === 'title') {
      setTitle(value);
    } else if (name === 'source') {
      setSource(value);
    } else if (name === 'separator') {
      setSeparator(value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    props.onSubmit(event);
  };

  return (
    <form onSubmit={ handleSubmit }>

      <label htmlFor="title">Title:</label>
      <input id="title"
             type="text"
             name="title"
             value={ title }
             onChange={ handleChangeEvent }
      />

      <label htmlFor="content">Content:</label>
      <textarea id="content"
                type="text"
                name="content"
                value={ content }
                onChange={ handleChangeEvent }
      />

      <label htmlFor="source">Source:</label>
      <input id="source"
             type="text"
             name="source"
             value={ source }
             onChange={ handleChangeEvent }
      />

      <label htmlFor="separator">Has Separator:</label>
      <input id="separator"
             type="checkbox"
             name="separator"
             value={ separator }
             onChange={ handleChangeEvent }
      />
      <input type="submit" value="Save note"/>
    </form>
  );
}
