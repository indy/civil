import React, { Component } from 'react';
import SubjectLink from './SubjectLink';

class SectionMentionedInSubjects extends Component {

  buildMentionedInSubject = (mentionedIn) => {
    return (
      <li key={ mentionedIn.subject_id }>
        <SubjectLink id={ mentionedIn.subject_id }
                     name={ mentionedIn.subject_name }/>
      </li>
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
