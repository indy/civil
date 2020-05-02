import { Link } from 'react-router-dom';
import React from 'react';

export default function DeckPoint({ deckPoint, holderId }) {
  let pointTitle = deckPoint.point_title === "Prime" && deckPoint.deck_resource === "events" ? "" : deckPoint.point_title;


  let item;
  if (deckPoint.deck_id === holderId) {
    item = <li className='relevent-deckpoint'>
             { deckPoint.deck_name } &mdash; { pointTitle } { deckPoint.point_date_textual }
           </li>;

  } else {
    item = <li className='deckpoint'>
             <Link to={ `/${deckPoint.deck_resource}/${deckPoint.deck_id}` }>
                { deckPoint.deck_name }  &mdash; { pointTitle } { deckPoint.point_date_textual }
              </Link>
           </li>;
  }

  return item;
}
