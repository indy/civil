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
                 source: form.source.value,
                 separator: form.separator.checked ? 1 : 0
               };

    return Net.post("/api/note/add", data);
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
                 separator: 0
               };
    return Net.post("/api/quote/add", data);
  },

  editNote: (id, data) => {
    const post = {
      id: id,
      note_type: 1, // a note
        ...data
    };

    return Net.post("/api/note/" + id.toString() + "/edit", post);
  },

  editQuote: (id, data) => {
    const post = {
      id: id,
      note_type: 2, // a quote
      separator: 0,
        ...data
    };

    return Net.post("/api/quote/" + id.toString() + "/edit", post);
  },

  deleteNote: (id) => {
    return Net.post("/api/note/" + id.toString() + "/delete");
  },

  deleteQuote: (id) => {
    return Net.post("/api/quote/" + id.toString() + "/delete");
  }
};


export default NoteUtils;
