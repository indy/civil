import React from 'react';

const ListingAnchor = props => {
  const href = `/${props.resource}/${props.id}`;
  return (<li><a href={ href }>{ props.name }</a></li>);
};

export default ListingAnchor;
