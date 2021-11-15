import { html, useState } from '/lib/preact/mod.js';
import RollableSection from '/js/components/RollableSection.js';

import { NOTE_SECTION_HIDE,
         NOTE_SECTION_SHOW,
         NOTE_SECTION_EXCLUSIVE } from '/js/components/DeckManager.js';

export default function RollableNoteSection({ heading, deckManager, noteKind }) {

  let howShow = deckManager.showNoteSection(noteKind);

  if (howShow === NOTE_SECTION_SHOW) {
    let noteManager = deckManager.noteManager(noteKind);
    return html`
      <${RollableSection} heading=${heading}>
        ${ noteManager }
      </${RollableSection}>`;
  } else if (howShow === NOTE_SECTION_HIDE) {
    return html`<div></div>`;
  } else if (howShow === NOTE_SECTION_EXCLUSIVE) {
    let noteManager = deckManager.noteManager(noteKind);
    return html`${ noteManager }`;
  }
}
