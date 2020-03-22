import React from 'react';
import ListingAnchor from './ListingAnchor';

export default function SectionMentionedByPeople(props) {
  const mentionedBy = props.mentionedBy.map(buildMentionedByPerson);

  if (mentionedBy.length === 0) {
    return (
      <div className="section-mentioned-by-people-is-empty"></div>
    );
  };

  return (
    <section className="mentioned-by-people">
      <h2>Mentioned by:</h2>
      <ul>
        { mentionedBy }
      </ul>
    </section>
  );
}

function buildMentionedByPerson(p) {
  return (
    <ListingAnchor key={ p.id } id={ p.id } name={ p.name } resource='people'/>
  );
}
