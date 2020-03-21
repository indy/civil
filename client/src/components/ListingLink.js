import React from 'react';
import { Link } from 'react-router-dom';

const ListingLink = props => {
  const href = `/${props.resource}/${props.id}`;
  return (<li><Link to={ href }>{ props.name }</Link></li>);
};

export default ListingLink;
