import { useParams } from 'react-router-dom';
import React, { useState } from 'react';

import TagForm from './TagForm';
import FormHandler from './FormHandler';
import NoteHolder from './NoteHolder';
import SectionLinkBacks from './SectionLinkBacks';
import ensureCorrectDeck from '../lib/EnsureCorrectDeck';

export default function Tag(props) {
  const {id} = useParams();
  const tag_id = parseInt(id, 10);

  const [tag, setTag] = useState({ id: tag_id });

  const resource = "tags";
  ensureCorrectDeck(tag_id, setTag, resource);

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
