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

  ensureCorrectDeck(tag_id, setTag, "tags");

  const notes = NoteHolder(tag, setTag);
  const tagForm = <TagForm id={ tag_id }
                           name={ tag.name }
                           update={ setTag }
                  />;
  const formHandler = FormHandler({
    noteContainer: tag,
    setNoteContainer: setTag,
    ident: { tag_id },
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
