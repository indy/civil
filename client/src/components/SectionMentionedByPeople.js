import React, { Component } from 'react';
import PersonLink from './PersonLink';

class SectionMentionedByPeople extends Component {

  buildMentionedByPerson = (mentionedBy) => {
    return (
      <li key={ mentionedBy.person_id }>
        <PersonLink id={ mentionedBy.person_id }
                    name={ mentionedBy.person_name }/>
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
