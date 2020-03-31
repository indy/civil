import NoteCompiler from './NoteCompiler';
import Net from './Net';


function splitIntoNotes(content) {
  const res = NoteCompiler.splitContent(content);
  if (res === null) {
    console.error(`NoteUtils: splitIntoNotes error for ${content}`);
    return null;
  }
  return res;
}

const NoteUtils = {
  addNote: (form, extra) => {
    const notes = splitIntoNotes(form.content.value);
    if (notes === null) {
      console.error("NoteUtils.addNote: splitIntoNotes failed");
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
  },

  addQuote: (form, extra) => {
    const notes = splitIntoNotes(form.content.value);
    if (notes === null) {
      console.error("NoteUtils.addQuote: splitIntoNotes failed");
      console.error(form.content.value);
      return undefined;
    }
    let data = { ...extra,
                 content: notes,
                 source: form.source.value,
                 separator: false
               };
    return Net.post("/api/quotes", data);
  },

  editNote: (id, data) => {
    const post = {
      id: id,
      note_type: 1, // a note
        ...data
    };

    return Net.put("/api/notes/" + id.toString(), post);
  },

  editQuote: (id, data) => {
    const post = {
      id: id,
      note_type: 2, // a quote
      separator: false,
        ...data
    };

    return Net.put("/api/quotes/" + id.toString(), post);
  },

  deleteNote: (id) => {
    return Net.delete("/api/notes/" + id.toString());
  },

  deleteQuote: (id) => {
    return Net.delete("/api/quotes/" + id.toString());
  },

  hashByNoteIds: (s) => {
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
};


export default NoteUtils;
