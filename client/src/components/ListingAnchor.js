import React from 'react';

export default function ListingAnchor(props) {
  const href = `/${props.resource}/${props.id}`;
  return (<li><a href={ href }>{ props.name }</a></li>);
};
