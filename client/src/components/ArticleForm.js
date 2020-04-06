import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import StateUtils from '../lib/StateUtils';
import Net from '../lib/Net';

export default function ArticleForm(props) {
  const [title, setTitle] = useState(props.title || '');
  const [author, setAuthor] = useState(props.author || '');
  const [source, setSource] = useState(props.source || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (props.title && props.title !== '' && title === '') {
    setTitle(props.title);
  }
  if (props.source && props.source !== '' && source === '') {
    setSource(props.source);
  }
  if (props.author && props.author !== '' && author === '') {
    setAuthor(props.author);
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "title") {
      setTitle(value);
    }
    if (name === "source") {
      setSource(value);
    }
    if (name === "author") {
      setAuthor(value);
    }
  };

  const handleSubmit = (event) => {
    const data = StateUtils.removeEmptyStrings({title, author, source}, ["source"]);

    if(props.update) {
      // edit an existing article
      Net.put(`/api/articles/${props.id}`, data).then(props.update);
    } else {
      // create a new article
      Net.post('/api/articles', data).then(article => {
        setRedirectUrl(`articles/${article.id}`);
      });
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <article>
        <section>
          <form onSubmit={ handleSubmit }>
            <label htmlFor="title">Title:</label>
            <input id="title"
                   type="text"
                   name="title"
                   value={ title }
                   onChange={ handleChangeEvent } />
            <label htmlFor="source">Source:</label>
            <input id="source"
                   type="text"
                   name="source"
                   value={ source }
                   onChange={ handleChangeEvent } />
            <label htmlFor="author">Author:</label>
            <input id="author"
                   type="text"
                   name="author"
                   value={ author }
                   onChange={ handleChangeEvent } />
            <input type="submit" value="Save"/>
          </form>
        </section>
      </article>
    );
  }
}
