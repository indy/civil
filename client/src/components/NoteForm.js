import React, { useState } from 'react';

export default function NoteForm(props) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [separator, setSeparator] = useState('separator');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === 'content') {
      setContent(value);
    } else if (name === 'title') {
      setTitle(value);
    } else if (name === 'separator') {
      setSeparator(value);
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
      <input type="submit" value="Save note"/>
    </form>
  );
}
