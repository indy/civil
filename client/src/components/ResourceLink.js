import React from 'react';
import { Link } from 'react-router-dom';

export default function ResourceLink(props) {
  const href = `/${props.resource}/${props.id}`;

  return (<Link to={ href }>{ props.name }</Link>);
}
