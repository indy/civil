import React, { useState } from 'react';

export default function NoteForm(props) {
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
      <br/>
      <input id="title"
             type="text"
             name="title"
             value={ title }
             onChange={ handleChangeEvent }
      />
      <br/>
      <label htmlFor="content">Content:</label>
      <br/>
      <textarea id="content"
                type="text"
                name="content"
                value={ content }
                onChange={ handleChangeEvent }
      />
      <br/>
      <label htmlFor="source">Source:</label>
      <br/>
      <input id="source"
             type="text"
             name="source"
             value={ source }
             onChange={ handleChangeEvent }
      />
      <br/>
      <label htmlFor="separator">Has Separator:</label>
      <br/>
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
