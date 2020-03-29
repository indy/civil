import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import Net from '../lib/Net';

export default function Tag(props) {
  const {id} = useParams();
  const tag_id = parseInt(id, 10);

  const [tag, setTag] = useState({
    id: tag_id,
  });

  const [currentTagId, setCurrentTagId] = useState(false);

  if (tag_id !== currentTagId) {
    // get here on first load and when we're already on a /tags/:id page and follow a Link to another /tags/:id
    //
    fetchTag();
  }

  function fetchTag() {
    setCurrentTagId(tag_id);
    Net.get(`/api/tags/${tag.id}`).then(s => {
      if (s) {
        setTag(s);
        window.scrollTo(0, 0);
      } else {
        console.error('fetchTag');
      }
    });
  };

  return (
    <article>
      <h1>{ tag.name }</h1>
    </article>
  );
}
