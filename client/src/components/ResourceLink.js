import React from 'react';

export default function ResourceLink(props) {
  const href = `/${props.resource}/${props.id}`;

  return (<a href={ href }>{ props.name }</a>);
}
