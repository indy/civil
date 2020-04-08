import React from 'react';

import TagForm from './TagForm';
import {idParam} from '../lib/appUtils';
import { useStateValue } from '../lib/state';
import NoteHolder from './NoteHolder';

export default function Tag(props) {
  const [state, dispatch] = useStateValue();
  const tag_id = idParam();

  const tag = state.tag[tag_id] || { id: tag_id };
  function setTag(newTag) {
    dispatch({
      type: 'setTag',
      id: tag_id,
      tag: newTag
    });
  }

  const tagForm = <TagForm id={ tag_id }
                           name={ tag.name }
                           update={ setTag }
                  />;

  return (
    <NoteHolder
      holder={ tag }
      setHolder={setTag}
      title={tag.name}
      resource="tags"
      isLoaded={ id => state.tag[id] }
      updateForm={tagForm}>
    </NoteHolder>
  );
}
