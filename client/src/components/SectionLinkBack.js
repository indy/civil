import React from 'react';
import ListingLink from './ListingLink';

export default function SectionLinkBack(props) {
  const linkbacks = props.linkbacks ? props.linkbacks.map(buildLinkback): [];

  if (linkbacks.length) {
    return (
      <section className="linkback">
        <h2>{ props.title }</h2>
        <ul>
          { linkbacks }
        </ul>
      </section>
    );
  } else {
    return (
      <div></div>
    );
  }
}

function buildLinkback(lb) {
  return (
    <ListingLink key={ lb.id } id={ lb.id } name={ lb.name } resource={ lb.resource }/>
  );
}
