import React from 'react';

const ArticleLink = props => {
  const url = `/articles/${props.id}`;
  return (
    <a href={ url }>
      { props.title }
    </a>
  );
};

export default ArticleLink;
