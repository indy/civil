import React from 'react';
import ListingLink from './ListingLink';

export default function SectionMentionedInArticles(props) {
  const mentionedIn = props.mentionedIn.map(buildMentionedInArticle);

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

function buildMentionedInArticle(mentionedIn) {
  return (
    <ListingLink key={mentionedIn.id} id={ mentionedIn.id } name={ mentionedIn.name } resource='articles'/>
  );
}
