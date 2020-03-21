import React, { Component } from 'react';
import ListingAnchor from './ListingAnchor';

class SectionMentionedByPeople extends Component {

  buildMentionedByPerson = (p) => {
    return (
      <ListingAnchor key={ p.id } id={ p.id } name={ p.name } resource='people'/>
    );
  }

  render () {
    const mentionedBy = this.props.mentionedBy.map(this.buildMentionedByPerson);

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
}

export default SectionMentionedByPeople;
