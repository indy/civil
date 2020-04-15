import React from 'react';
import ListingLink from './ListingLink';
import { capitalise } from '../lib/utils';

export default function SectionLinkBacks(props) {
  return (
    <div>
      <SectionLinkBack linkbacks={ props.linkingTo.linkbacks_to_decks }/>
      <SectionSearchResultsLinkBack linkbacks={ props.linkingTo.search_results }/>
    </div>
  );
}

function SectionSearchResultsLinkBack(props) {
  const linkbacks = props.linkbacks || [];
  return listingLinks(linkbacks, "Search Results");
}

function SectionLinkBack(props) {
  const linkbacks = props.linkbacks || [];
  const sections = [];
  const groupedLinkbacks = groupByResource(linkbacks);

  Object.keys(groupedLinkbacks).forEach(key => {
    let section = listingLinks(groupedLinkbacks[key]);
    sections.push(section);
  });

  return (
    <div>
      { sections }
    </div>
  );
}

function groupByResource(linkbacks) {
  // key == resource, value == array of ListingLink components
  let res = {};
  linkbacks.forEach(lb => {
    res[lb.resource] = res[lb.resource] || [];
    res[lb.resource].push(lb);
  });

  return res;
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
