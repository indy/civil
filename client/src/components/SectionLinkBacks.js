import React from 'react';
import ListingLink from './ListingLink';

export default function SectionLinkBacks(props) {
  return (
    <div>
      <SectionLinkBack linkbacks={ props.linkingTo.linkbacks_to_ideas }/>
      <SectionLinkBack linkbacks={ props.linkingTo.linkbacks_to_tags }/>
      <SectionLinkBack linkbacks={ props.linkingTo.linkbacks_to_decks }/>
    </div>
  );
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

function listingLinks(linkbacks) {
  if (linkbacks.length === 0) {
    return (<div></div>);
  }

  let list = linkbacks.map(buildLinkback);
  let groupedHeading = linkbacks[0].resource;
  let sectionId = linkbacks[0].id;

  return (
    <section key={ sectionId }>
      <h2>{ groupedHeading }</h2>
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
