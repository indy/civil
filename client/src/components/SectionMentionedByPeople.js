import React, { Component } from 'react';
import PersonLink from './PersonLink';

class SectionMentionedByPeople extends Component {

  buildMentionedByPerson = (mentionedBy) => {
    return (
      <li key={ mentionedBy.id }>
        <PersonLink id={ mentionedBy.id }
                    name={ mentionedBy.name }/>
      </li>
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
