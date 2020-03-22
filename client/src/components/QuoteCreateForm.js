import React, { useState } from 'react';

export default function QuoteCreateForm(props) {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;

    if (name === 'content') {
      setContent(target.value);
    }
    if (name === 'source') {
      setSource(target.value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    props.onSubmit(event);
  };

  return (
    <form onSubmit={ handleSubmit }>

      <label htmlFor="content">Quote:</label>
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
      <input type="submit" value="Save quote"/>
    </form>
  );
}
