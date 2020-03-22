import React from 'react';
import { Link } from 'react-router-dom';

export default function ListingLink(props) {
  const href = `/${props.resource}/${props.id}`;
  return (<li><Link to={ href }>{ props.name }</Link></li>);
};
