import React from 'react';

export default function DeckPoint({ deckPoint, holderId }) {
  let className = deckPoint.deck_id === holderId ? 'relevent-deckpoint' : 'deckpoint';
  let pointTitle = deckPoint.point_title === "Prime" && deckPoint.deck_resource === "events" ? "" : deckPoint.point_title;


  return (
    <li className={ className }>
       { deckPoint.deck_name } &mdash; { pointTitle } { deckPoint.point_date_textual }
    </li>
  );
}
