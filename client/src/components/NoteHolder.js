import React, { useState } from 'react';

// UNCOMMENT to enable deleting
// import { useHistory } from 'react-router-dom';

import Point from './Point';
import PointForm from './PointForm';
import Net from '../lib/Net';
import Note from './Note';
import NoteForm from './NoteForm';
import NoteCompiler from '../lib/NoteCompiler';

import SectionLinkBacks from './SectionLinkBacks';
import { useStateValue } from '../lib/state';
import { ensureAC, separateIntoTagsAndDecks } from '../lib/utils';
import { addChronologicalSortYear } from '../lib/eras';

export default function NoteHolder({holder, setMsg, title, resource, isLoaded, updateForm, children}) {
  // UNCOMMENT to enable deleting
  // let history = useHistory();

  const [state, dispatch] = useStateValue();
  if (state.dummy) {
    // just to stop the build tool from complaining about unused state
  }

  const id = holder.id;

  ensureCorrectNoteHolder(resource, id, isLoaded, setMsg, dispatch);

  const [showButtons, setShowButtons] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showPointForm, setShowPointForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  function buildButtons() {
    function onAddNoteClicked(e) {
      setShowNoteForm(!showNoteForm);
      e.preventDefault();
    };

    function onAddPointClicked(e) {
      setShowPointForm(!showPointForm);
      e.preventDefault();
    };

    function onEditParentClicked(e) {
      setShowUpdateForm(!showUpdateForm);
      e.preventDefault();
    };

    function onDeleteParentClicked(e) {
      // UNCOMMENT to enable deleting
      // Net.delete(`/api/${resource}/${id}`).then(() => {
      //   history.push(`/${resource}`);
      // });

      alert("delete logic has been commented out of NoteHolder.js, re-enable if that's what you _REALLY_ want to do");

      e.preventDefault();
    };

    return (
      <div>
        <button onClick={ onAddNoteClicked }>Add Note...</button>
        { holder.points && <button onClick={ onAddPointClicked }>Add Point...</button> }
        <button onClick={ onEditParentClicked }>Edit...</button>
        <button onClick={ onDeleteParentClicked }>Delete...</button>
      </div>
    );
  };

  function buildNoteForm() {
    function onAddNote(e) {
      const noteForm = e.target;
      addNote(noteForm, { deck_id: id })
        .then(newNotes => {
          const notes = holder.notes;
          newNotes.forEach(n => {
            notes.push(n);
          });

          setHolder(dispatch, {...holder, notes}, setMsg);
          setShowNoteForm(false);
          setShowUpdateForm(false);
        });
    };

    return (
      <NoteForm onSubmit={ onAddNote }/>
    );
  };

  function buildPointForm() {
    function onAddPoint(point) {
      const url = `/api/${resource}/${holder.id}/points`;
      Net.post(url, point).then(updatedHolder => {
        sortPoints(updatedHolder);
        setHolder(dispatch, updatedHolder, setMsg);
        setShowPointForm(false);
      });
    };

    return (
      <PointForm onSubmit={ onAddPoint } submitMessage="Create Point"/>
    );
  };

  function onShowButtons() {
    setShowButtons(!showButtons);
    setShowNoteForm(false);
    setShowUpdateForm(false);
  };

  function showUpdate() {
    return updateForm;
  };

  const notes = NoteManager(holder, setMsg);

  return (
    <article>
      <div>
        <h1 onClick={ onShowButtons }>{ title }</h1>
        { showButtons && buildButtons() }
        { showNoteForm && buildNoteForm() }
        { showPointForm && buildPointForm() }
        { showUpdateForm && showUpdate() }
      </div>
      { children }
      { holder.points && showPoints(holder.points, resource) }
      <section>
        { notes }
      </section>
      <SectionLinkBacks linkingTo={ holder }/>
    </article>
  );
}

function sortPoints(holder) {
  if (holder.points) {
    holder.points = holder.points
        .map(addChronologicalSortYear)
        .sort((a, b) => a.sort_year > b.sort_year);
  }
}

function setHolder(dispatch, holder, setMsg) {
  dispatch({
    type: setMsg,
    id: holder.id,
    newItem: holder
  });
}

function showPoints(points, resource) {
  function buildPoint(point) {
    return (<Point key={ point.id} point={ point } parentResource={ resource }/>);
  };
  return (<span>{ points.map(buildPoint) }</span>);
}


function ensureCorrectNoteHolder(resource, id, isLoaded, setMsg, dispatch) {
  const [currentId, setCurrentId] = useState(false);

  if (id !== currentId) {
    // get here on first load and when we're already on a /$NOTE_HOLDER/:id page
    // and follow a Link to another /$NOTE_HOLDER/:id
    // (where $NOTE_HOLDER is the same type)
    //
    setCurrentId(id);

    if(!isLoaded(id)) {
      // fetch resource from the server
      const url = `/api/${resource}/${id}`;
      Net.get(url).then(s => {
        if (s) {
          let updatedHolder = applyTagsAndDecksToNotes(s);
          sortPoints(updatedHolder);
          setHolder(dispatch, updatedHolder, setMsg);
        } else {
          console.error(`error: fetchDeck for ${url}`);
        }
      });
    }
  }
};

function NoteManager(holder, setMsg) {
  const [state, dispatch] = useStateValue();

  ensureAC(state, dispatch);

  const ac = state.ac;

  function addNewTagsToAutocomplete(someTags) {
    let newTags = [];

    someTags.forEach(t => {
      let preExisting = ac.tags.some(a => {
        return a.value === t.name;
      });

      if (!preExisting) {
        // this tag was recently created, so add it to the autocomplete list
        newTags.push({
          id: t.id,
          value: t.name,
          label: t.name
        });
      }
    });

    dispatch({
      type: 'addAutocompleteTags',
      tags: newTags
    });
  };

  function findNoteWithId(id, modifyFn) {
    const notes = holder.notes;
    const index = notes.findIndex(n => n.id === id);

    modifyFn(notes, index);
    setHolder(dispatch, {...holder, notes}, setMsg);
  };

  function onEditedNote(id, data) {
    findNoteWithId(id, (notes, index) => {
      notes[index] = Object.assign(notes[index], data);
    });
  };

  function onDeleteNote(noteId) {
    findNoteWithId(noteId, (notes, index) => {
      notes.splice(index, 1);
    });
  };

  function onTagsChanged(note, newTagsCreated) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });

    // add any newly created tags to the autocomplete list
    if(newTagsCreated) {
      addNewTagsToAutocomplete(note.tags);
    }
  };

  function onDecksChanged(note) {
    findNoteWithId(note.id, (notes, index) => {
      notes[index] = note;
    });
  };

  function buildNoteComponent(note) {
    return (
      <Note key={ note.id }
            note={ note }
            ac = { ac }
            onDelete={ onDeleteNote }
            onEdited={ onEditedNote }
            onTagsChanged={ onTagsChanged }
            onDecksChanged={ onDecksChanged }
      />
    );
  }

  const notes = holder.notes ? holder.notes.map(buildNoteComponent) : [];

  return notes;
}

function splitIntoNotes(content) {
  const res = NoteCompiler.splitContent(content);
  if (res === null) {
    console.error(`splitIntoNotes error for ${content}`);
  }
  return res;
}

function addNote(form, extra) {
    const notes = splitIntoNotes(form.content.value);
    if (notes === null) {
      console.error("addNote: splitIntoNotes failed");
      console.error(form.content.value);
      return undefined;
    }
    let data = { ...extra,
                 content: notes,
                 title: form.title.value,
                 source: form.source.value,
                 separator: form.separator.checked
               };

    return Net.post("/api/notes", data);
}

function applyTagsAndDecksToNotes(obj) {
  let [tags, decks] = separateIntoTagsAndDecks(obj.decks_in_notes);

  const tagsInNotes = hashByNoteIds(tags);
  const decksInNotes = hashByNoteIds(decks);

  for(let i = 0;i<obj.notes.length;i++) {
    let n = obj.notes[i];
    n.tags = tagsInNotes[n.id];
    n.decks = decksInNotes[n.id];
  }

  return obj;
}

function hashByNoteIds(s) {
  s = s || [];
  return s.reduce(function(a, b) {
    const note_id = b.note_id;
    if (a[note_id]) {
      a[note_id].push(b);
    } else {
      a[note_id] = [b];
    }
    return a;
  }, {});
}
