import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { removeEmptyStrings } from '../lib/JsUtils';
import Net from '../lib/Net';
import { useStateValue } from '../lib/state';

export default function ArticleForm({ article, setMsg }) {
  article = article || {};
  const [state, dispatch] = useStateValue();
  const [title, setTitle] = useState(article.title || '');
  const [author, setAuthor] = useState(article.author || '');
  const [source, setSource] = useState(article.source || '');
  const [redirectUrl, setRedirectUrl] = useState(false);

  if (article.title && article.title !== '' && title === '') {
    setTitle(article.title);
  }
  if (article.source && article.source !== '' && source === '') {
    setSource(article.source);
  }
  if (article.author && article.author !== '' && author === '') {
    setAuthor(article.author);
  }
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
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
    const data = removeEmptyStrings({title, author, source}, ["source"]);

    if(setMsg) {
      // edit an existing article
      Net.put(`/api/articles/${article.id}`, data).then(newItem => {
        dispatch({
          type: setMsg,
          id: article.id,
          newItem
        });
      });
    } else {
      // create a new article
      Net.post('/api/articles', data).then(article => {

        dispatch({
          type: 'addAutocompleteDeck',
          id: article.id,
          value: article.title,
          label: article.title
        });

        setRedirectUrl(`articles/${article.id}`);
      });
    }

    event.preventDefault();
  };

  if (redirectUrl) {
    return <Redirect to={ redirectUrl } />;
  } else {
    return (
      <form className="civil-form" onSubmit={ handleSubmit }>
        <label htmlFor="title">Title:</label>
        <br/>
        <input id="title"
               type="text"
               name="title"
               value={ title }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="source">Source:</label>
        <br/>
        <input id="source"
               type="text"
               name="source"
               value={ source }
               onChange={ handleChangeEvent } />
        <br/>
        <label htmlFor="author">Author:</label>
        <br/>
        <input id="author"
               type="text"
               name="author"
               value={ author }
               onChange={ handleChangeEvent } />
        <br/>
        <input type="submit" value={ setMsg ? "Update Article" : "Create Article"}/>
      </form>
    );
  }
}
