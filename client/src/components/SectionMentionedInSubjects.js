import React, { Component } from 'react';
import ListingAnchor from './ListingAnchor';

class SectionMentionedInSubjects extends Component {

  buildMentionedInSubject = (mentionedIn) => {
    return (
      <ListingAnchor key={mentionedIn.id} id={ mentionedIn.id } name={ mentionedIn.name } resource='subjects'/>
    );
  }

  render () {
    const mentionedIn = this.props.mentionedIn.map(this.buildMentionedInSubject);

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
}

export default SectionMentionedInSubjects;
