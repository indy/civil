import React from 'react';

import NoteHolder from './NoteHolder';
import TagForm from './TagForm';
import { idParam } from '../lib/utils';
import { useStateValue } from '../lib/state';

export default function Tag(props) {
  const [state] = useStateValue();
  const tag_id = idParam();
  const tag = state.tag[tag_id] || { id: tag_id };
  const tagForm = <TagForm tag={ tag } setMsg="setTag" />;

  return (
    <NoteHolder
      holder={ tag }
      setMsg="setTag"
      title={ tag.name }
      resource="tags"
      isLoaded={ id => state.tag[id] }
      updateForm={tagForm}>
    </NoteHolder>
  );
}
