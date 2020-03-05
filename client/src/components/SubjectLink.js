import React from 'react';

const SubjectLink = props => {
  const url = `/subject/${props.id}`;
  return (
    <a href={ url }>
      { props.name }
    </a>
  );
};

export default SubjectLink;
