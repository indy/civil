import React from 'react';

const ResourceLink = props => {
  const href = `/${props.resource}/${props.id}`;
  return (<a href={ href }>{ props.name }</a>);
};

export default ResourceLink;
