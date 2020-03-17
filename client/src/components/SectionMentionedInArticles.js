import React, { Component } from 'react';
import ArticleLink from './ArticleLink';

class SectionMentionedInArticles extends Component {

  buildMentionedInArticle = (mentionedIn) => {
    return (
      <li key={ mentionedIn.id }>
        <ArticleLink id={ mentionedIn.id }
                     title={ mentionedIn.name }/>
      </li>
    );
  }

  render () {
    const mentionedIn = this.props.mentionedIn.map(this.buildMentionedInArticle);

    if (mentionedIn.length === 0) {
      return (
        <div className="section-mentioned-in-articles-is-empty"></div>
      );
    };

    return (
      <section className="mentioned-in-articles">
        <h2>Mentioned in Articles:</h2>
        <ul>
          { mentionedIn }
        </ul>
      </section>
    );
  }
}

export default SectionMentionedInArticles;
