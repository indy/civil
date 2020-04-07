import React from 'react';

import TagForm from './TagForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import {ensureCorrectDeck, idParam} from '../lib/appUtils';
import { useStateValue } from '../state';

export default function Tag(props) {
  const [state, dispatch] = useStateValue();
  const tag_id = idParam();
  const resource = "tags";

  function setTag(newTag) {
    dispatch({
      type: 'setTag',
      id: tag_id,
      tag: newTag
    });
  }

  function isLoaded(id) {
    return state.tag[id];
  }

  ensureCorrectDeck(resource, tag_id, isLoaded, setTag);

  const tag = state.tag[tag_id] || { id: tag_id };
  const notes = NoteHolder(tag, setTag);

  const tagForm = <TagForm id={ tag_id }
                           name={ tag.name }
                           update={ setTag }
                  />;
  const formHandler = FormHandler({
    resource,
    id: tag_id,
    noteContainer: tag,
    setNoteContainer: setTag,
    title: tag.name,
    form: tagForm
  });

  return (
    <article>
      { formHandler }
      <section className="tag-notes">
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ tag }/>
    </article>
  );
}
