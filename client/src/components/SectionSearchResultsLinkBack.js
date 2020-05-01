import React from 'react';
import ListingLink from './ListingLink';
import { capitalise } from '../lib/JsUtils';

export default function SectionSearchResultsLinkBack(props) {
  const linkbacks = props.linkbacks || [];
  return listingLinks(linkbacks, "Additional Search Results");
}

function listingLinks(linkbacks, heading) {
  if (linkbacks.length === 0) {
    return (<div></div>);
  }

  let list = linkbacks.map(buildLinkback);
  let sectionHeading = capitalise(heading || linkbacks[0].resource);
  let sectionId = linkbacks[0].id;

  return (
    <section key={ sectionId }>
      <h2>{ sectionHeading }</h2>
      <ul>
        { list }
      </ul>
    </section>
  );
}

function buildLinkback(lb) {
  return (
    <ListingLink key={ lb.id } id={ lb.id } name={ lb.name } resource={ lb.resource }/>
  );
}
