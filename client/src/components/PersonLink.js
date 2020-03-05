import React from 'react';

const PersonLink = props => {
  const url = `/person/${props.id}`;
  return (
    <a href={ url }>
      { props.name }
    </a>
  );
};

export default PersonLink;
