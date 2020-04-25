import React, { useState } from 'react';

export default function NoteForm(props) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [separator, setSeparator] = useState('separator');
  const [sidenote, setSidenote] = useState('');

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
    } else if (name === 'sidenote') {
      setSidenote(value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    props.onSubmit(event);
  };

  return (
    <form className="civil-form" onSubmit={ handleSubmit }>
      <label htmlFor="separator">Top Separator:</label>
      <input id="separator"
             type="checkbox"
             name="separator"
             value={ separator }
             onChange={ handleChangeEvent }
      />
      <p></p>
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
      <label htmlFor="sidenote">Sidenote:</label>
      <br/>
      <textarea id="sidenote"
                type="text"
                name="sidenote"
                value={ sidenote }
                onChange={ handleChangeEvent }
      />
      <br/>
      <input type="submit" value="Save note"/>
    </form>
  );
}
