import { h, html, Link, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';

import { plural } from '/js/JsUtils.js';
import { useLocalReducer } from '/js/PreactUtils.js';


const FLASHCARD_IS_EDITING_TOGGLE = 'flashcard-is-editing-toggle';
const FLASHCARD_SET_PROMPT = 'flashcard-set-prompt';
const FLASHCARD_EDITING_SAVED = 'flashcard-editing-saved';
const FLASHCARD_EDITING_CANCELLED = 'flashcard-editing-cancelled';
const FLASHCARD_DELETED = 'flashcard-deleted';
const FLASHCARD_TOGGLE_DELETE_CONFIRMATION = 'flashcard-toggle-delete-confirmation';

function reducer(state, action) {
  switch(action.type) {
  case FLASHCARD_IS_EDITING_TOGGLE: {
    const newState = { ...state };
    newState.isEditingFlashCard = !newState.isEditingFlashCard;
    newState.showDeleteToggle = false;
    return newState;
  }
  case FLASHCARD_SET_PROMPT: {
    const newState = { ...state };
    newState.flashcard.prompt = action.data.prompt;
    return newState;
  }
  case FLASHCARD_DELETED: {
    const newState = { ...state };
    newState.isEditingFlashCard = false;
    newState.showDeleteToggle = false;
    return newState;
  }
  case FLASHCARD_EDITING_SAVED: {
    const newState = { ...state };
    newState.originalFlashcard.prompt = newState.flashcard.prompt;
    newState.isEditingFlashCard = false;

    return newState;
  }
  case FLASHCARD_EDITING_CANCELLED: {
    const newState = { ...state };
    newState.flashcard.prompt = newState.originalFlashcard.prompt;
    newState.isEditingFlashCard = false;

    console.log(newState);


    return newState;
  }
  case FLASHCARD_TOGGLE_DELETE_CONFIRMATION: {
    const newState = { ...state };
    newState.showDeleteToggle = !newState.showDeleteToggle;

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }
}


export default function FlashCard({flashcard, onDelete}) {

  let dateOptions = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

  const initialState = {
    nextTestDateString: (new Date(flashcard.next_test_date)).toLocaleDateString("en-US", dateOptions),
    daysUntilNextTest: plural(daysUntil(flashcard.next_test_date), "day", "s"),
    isEditingFlashCard: false,
    showDeleteConfirmation: false,
    originalFlashcard: { ...flashcard },
    flashcard: { ...flashcard },
    showDeleteToggle: false
  };

  const [local, localDispatch] = useLocalReducer(reducer, initialState);

  function handleChangeEvent(e) {
    const target = e.target;
    localDispatch(FLASHCARD_SET_PROMPT, { prompt: target.value });
  };

  function editToggleClicked(e) {
    e.preventDefault();
    localDispatch(FLASHCARD_IS_EDITING_TOGGLE);
  }

  function deleteClicked(e) {
    e.preventDefault();
    localDispatch(FLASHCARD_TOGGLE_DELETE_CONFIRMATION);
  }

  function confirmedDeleteClicked(e) {
    e.preventDefault();

    const url = `/api/sr/${local.flashcard.id}`;
    Net.delete(url).then(() => {
      localDispatch(FLASHCARD_DELETED);
      onDelete();
    });

  }

  function cancelDeleteClicked(e) {
    e.preventDefault();
    localDispatch(FLASHCARD_TOGGLE_DELETE_CONFIRMATION);
  }


  function saveClicked(e) {
    e.preventDefault();

    const url = `/api/sr/${local.flashcard.id}`;
    Net.put(url, local.flashcard).then(updatedFlashcard => {
      localDispatch(FLASHCARD_EDITING_SAVED);
    });
  }

  function cancelClicked(e) {
    e.preventDefault();
    localDispatch(FLASHCARD_EDITING_CANCELLED);
  }

  if (!local.isEditingFlashCard) {
    // Normal View
    //
    return html`
    <div class="note">
      <div>
        <p>
          <span class="right-margin">Next test in ${local.daysUntilNextTest} (${ local.nextTestDateString })</span>
          <div class="in-note-flash-card-prompt">
            ${ local.flashcard.prompt }
          </div>
        </p>
        <div>
          <button onClick=${ editToggleClicked }>Edit FlashCard</button>
          ${!local.showDeleteToggle && html`<button onClick=${ deleteClicked }>Delete FlashCard</button>`}
          ${ local.showDeleteToggle && html`<button onClick=${ cancelDeleteClicked }>No, Cancel Delete</button>`}
          ${ local.showDeleteToggle && html`<button onClick=${ confirmedDeleteClicked }>Yes, Really Delete</button>`}
        </div>
      </div>
    </div>`;
  } else {
    // Editing
    //
    return html`
    <div class="note">
      <div>
        <p>
          <span class="right-margin">Next test in ${local.daysUntilNextTest} (${ local.nextTestDateString })</span>
          <div class="civil-form">
            <textarea id="flashcard-prompt"
                      type="text"
                      name="flashcard-prompt"
                      value=${ local.flashcard.prompt }
                      onInput=${ handleChangeEvent }/>
          </div>
        </p>
        <div>
          <button onClick=${ saveClicked }>Save Edits</button>
          <button onClick=${ cancelClicked } >Cancel Editing</button>
        </div>
      </div>
    </div>`;
  }
}


function daysUntil(date) {
  let nextTestDate  = new Date(date);
  let todayDate = new Date();


  let delta = nextTestDate.getTime() - todayDate.getTime();
  let deltaDays = delta / (1000 * 3600 * 24);

  return Math.round(deltaDays);
}
