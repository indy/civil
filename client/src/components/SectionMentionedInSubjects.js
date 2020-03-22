import React from 'react';
import ListingAnchor from './ListingAnchor';


export default function SectionMentionedInSubjects(props) {
  const mentionedIn = props.mentionedIn.map(buildMentionedInSubject);

  if (mentionedIn.length === 0) {
    return (
      <div className="section-mentioned-in-subjects-is-empty"></div>
    );
  };

  return (
    <section className="mentioned-in-subjects">
      <h2>Mentioned in Subjects:</h2>
      <ul>
        { mentionedIn }
      </ul>
    </section>
  );
}

function buildMentionedInSubject(mentionedIn) {
  return (
    <ListingAnchor key={mentionedIn.id} id={ mentionedIn.id } name={ mentionedIn.name } resource='subjects'/>
  );
}
