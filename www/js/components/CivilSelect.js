import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { useLocalReducer } from '/js/PreactUtils.js';
import { svgCloseShifted } from '/js/svgIcons.js';
import { sortByResourceThenName } from '/js/CivilUtils.js';
import { indexToShortcut } from '/js/CivilUtils.js';

const CANDIDATES_SET = 'candidate-set';
const CTRL_KEY_DOWN = 'ctrl-key-down';
const CURRENTLY_CHOSEN_RESET = 'currently-chosen-reset';
const ESC_KEY_DOWN = 'esc-key-down';
const INPUT_GIVEN = 'input-given';
const REFERENCE_CHANGE_ANNOTATION = 'reference-change-annotation';
const REFERENCE_CHANGE_KIND = 'reference-change-kind';
const REFERENCE_REMOVE = 'reference-remove';
const SELECT_ADD = 'select-add';
const SELECT_CREATE = 'select-create';
const SHORTCUT_CHECK = 'shortcut-check';

function candidateToRef(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    resource: candidate.resource,
    annotation: null,
    ref_kind: "Ref"
  }
}

function rebuildCurrentSelection(state) {
  state.currentSelection = state.referencesUnchanged.concat(state.referencesChanged,
                                                            state.referencesAdded,
                                                            state.referencesCreated);

  state.currentSelection.sort(sortByResourceThenName);
  return state;
}

function reducer(state, action) {
  switch(action.type) {
  case ESC_KEY_DOWN: return {
    ...state,
    candidates: []
  };
  case CTRL_KEY_DOWN: {
    const e = action.data;

    const newState = { ...state };

    if (!state.showKeyboardShortcuts && state.candidates.length) {
      newState.showKeyboardShortcuts = true;
    } else {
      newState.showKeyboardShortcuts = false;
    }

    return newState;
  }
  case SHORTCUT_CHECK: {
    if (state.showKeyboardShortcuts && state.candidates.length > action.data) {
      const index = action.data;
      const newState = reducer(state, { type: SELECT_ADD, data: state.candidates[index]});

      newState.justAddedViaShortcut = true; // INPUT_GIVEN will not display this shortcut key
      newState.showKeyboardShortcuts = false;

      return newState;
    } else {
      return state;
    }
  }
  case REFERENCE_REMOVE: {
    let newState = { ...state };

    let refToRemove = action.data;

    if (state.referencesUnchanged.find(r => r.id === refToRemove.id)) {
      // remove from the referencesUnchanged and add into referencesRemoved
      newState.referencesUnchanged = newState.referencesUnchanged.filter(r => { return r.id !== refToRemove.id; });
      newState.referencesRemoved.push(refToRemove);
    } else if (state.referencesChanged.find(r => r.id === refToRemove.id)) {
      // remove from the referencesChanged and add into referencesRemoved
      newState.referencesChanged = newState.referencesChanged.filter(r => { return r.id !== refToRemove.id; });
      newState.referencesRemoved.push(refToRemove);
    } else if (state.referencesAdded.find(r => r.id === refToRemove.id)) {
      newState.referencesAdded = newState.referencesAdded.filter(r => { return r.id !== refToRemove.id; });
    } else if (state.referencesCreated.find(r => r.id === refToRemove.id)) {
      newState.referencesCreated = newState.referencesCreated.filter(r => { return r.id !== refToRemove.id; });
    }

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case REFERENCE_CHANGE_KIND: {
    let newState = { ...state };

    let refToChangeKind = action.data.reference;

    let found = state.referencesUnchanged.find(r => r.id === refToChangeKind.id);
    if (found) {
      // move from unchanged to changed
      newState.referencesUnchanged = state.referencesUnchanged.filter(r => r.id !== found.id);
      newState.referencesChanged.push(found);
    }
    if (!found) {
      found = state.referencesChanged.find(r => r.id === refToChangeKind.id);
    }
    if (!found) {
      found = state.referencesAdded.find(r => r.id === refToChangeKind.id);
    }
    if (!found) {
      found = state.referencesCreated.find(r => r.id === refToChangeKind.id);
    }

    if (found) {
      found.ref_kind = action.data.newKind;
    }

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case REFERENCE_CHANGE_ANNOTATION: {
    let newState = { ...state };

    let refToChangeAnnotation = action.data.reference;

    let found = state.referencesUnchanged.find(r => r.id === refToChangeAnnotation.id);
    if (found) {
      // move from unchanged to changed
      newState.referencesUnchanged = state.referencesUnchanged.filter(r => r.id !== found.id);
      newState.referencesChanged.push(found);
    }
    if (!found) {
      found = state.referencesChanged.find(r => r.id === refToChangeAnnotation.id);
    }
    if (!found) {
      found = state.referencesAdded.find(r => r.id === refToChangeAnnotation.id);
    }
    if (!found) {
      found = state.referencesCreated.find(r => r.id === refToChangeAnnotation.id);
    }

    if (found) {
      found.annotation = action.data.annotation;
    }

    newState.canSave = true;

    newState = rebuildCurrentSelection(newState);

    return newState;
  };
  case SELECT_ADD: {
    let newState = { ...state };

    let refToAdd = candidateToRef(action.data);

    newState.referencesAdded.push(refToAdd);

    newState.canSave = true;
    newState.text = '';
    newState.candidates = [];

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case SELECT_CREATE: {
    let newState = { ...state };

    let refToCreate = action.data;

    newState.referencesCreated.push(refToCreate);

    newState.canSave = true;
    newState.text = '';

    newState = rebuildCurrentSelection(newState);

    return newState;
  }
  case CANDIDATES_SET: return {
    ...state,
    candidates: action.data
  }
  case INPUT_GIVEN: {
    const newState = {
      ...state,
      text: action.data
    };

    if (newState.justAddedViaShortcut) {
      newState.text = '';
      newState.justAddedViaShortcut = false;
    }

    return newState;
  }
  default: throw new Error(`unknown action: ${action}`);
  }

}

export default function CivilSelect({ parentDeckId, chosen, onFinish }) {

  const s = {
    currentSelection: undefined, // built by rebuildCurrentSelection

    // make copies of each of the chosen, otherwise cancelling after making edits still shows up on the parent Note
    // (this is because [...chosen] doesn't deep copy the elements of the array)
    referencesUnchanged: (chosen || []).map(ref => Object.assign({}, ref)),
    referencesChanged: [],
    referencesRemoved: [],
    referencesAdded: [],
    referencesCreated: [],

    text: '',

    showKeyboardShortcuts: false,
    candidates: [],
    canSave: false
  }
  const [local, localDispatch] = useLocalReducer(reducer, rebuildCurrentSelection(s));

  const onKeyDown = e => {
    if (e.key === "Escape") {
      localDispatch(ESC_KEY_DOWN);
    }
    if (e.ctrlKey) {
      localDispatch(CTRL_KEY_DOWN, e);
    }
    if ((e.keyCode >= 49 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90)) {
      // digit: 1 -> 0, 2 -> 1, ... 9 -> 8       letter: a -> 9, b -> 10, ... z -> 34
      const index = (e.keyCode >= 49 && e.keyCode <= 57) ? e.keyCode - 49 : (e.keyCode - 65) + 9;
      localDispatch(SHORTCUT_CHECK, index);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [])


  function onTextChanged(newText) {
    refineCandidates(newText);
    localDispatch(INPUT_GIVEN, newText);
  }

  function alreadySelected(name) {
    return local.currentSelection.some(cv => { return cv.name === name;});
  }

  async function refineCandidates(newText) {
    if (!local.justAddedViaShortcut && newText.length > 0) {
      const url = `/api/cmd/namesearch?q=${encodeURI(newText)}`;
      const searchResponse = await Net.get(url);

      if (searchResponse.results) {
        const newCandidates = searchResponse.results
              .filter(op => { return (op.id !== parentDeckId) && !alreadySelected(op.name); })
              .sort((a, b) => { return a.name.length - b.name.length; });
        localDispatch(CANDIDATES_SET, newCandidates);
      }
    } else {
      localDispatch(CANDIDATES_SET, []);
    }
  }


  function onLocalCancel(e) {
    onFinish();
  }

  function onLocalCommit(e) {
    onFinish({
      referencesUnchanged: local.referencesUnchanged,
      referencesChanged: local.referencesChanged,
      referencesRemoved: local.referencesRemoved,
      referencesAdded: local.referencesAdded,
      referencesCreated: local.referencesCreated
    });
  }

  return html`<div class='civsel-main-box'>
                ${ local.currentSelection.map((value, i) => html`<${SelectedReference}
                  reference=${value}
                  onRemove=${ (e) => localDispatch(REFERENCE_REMOVE, e) }
                  onChangeKind=${ (reference, newKind) => localDispatch(REFERENCE_CHANGE_KIND, { reference, newKind })}
                  onChangeAnnotation=${ (reference, annotation) => localDispatch(REFERENCE_CHANGE_ANNOTATION,
                                                                                 { reference, annotation})}/>`) }
                <${Input} text=${local.text}
                          onTextChanged=${onTextChanged}
                          candidates=${ local.candidates }
                          onAdd=${ (existingDeck) => localDispatch(SELECT_ADD, existingDeck) }
                          onCreate=${ (newDeckInfo) => localDispatch(SELECT_CREATE, newDeckInfo) }
                          currentSelection=${ local.currentSelection }
                          showKeyboardShortcuts=${ local.showKeyboardShortcuts }/>
               <button onClick=${ onLocalCancel }>Cancel</button>
               <button onClick=${ onLocalCommit } disabled=${ !local.canSave }>${ local.showKeyboardShortcuts && html`Ctrl-Enter`} Save Changes</button>
              </div>`;
}

function SelectedReference({ reference, onRemove, onChangeKind, onChangeAnnotation }) {
  function onClick(e) {
    e.preventDefault();
    onRemove(reference);
  }

  function onKindDropDownSelect(e) {
    onChangeKind(reference, e.target.value);
  }

  const handleChangeEvent = (event) => {
    const target = event.target;
    const name = target.name;
    const value = target.value;

    if (name === "annotation") {
      onChangeAnnotation(reference, value);
    }
  };

  return html`<div class='civsel-reference pigment-${reference.resource}'>
                <span class='civsel-delete-selected' onClick=${onClick}>${svgCloseShifted()}</span>
                <select onChange=${onKindDropDownSelect} name="choice">
                  <option value="Ref" selected=${reference.ref_kind == "Ref"}>Generic Reference</option>
                  <option value="RefToParent" selected=${reference.ref_kind == "RefToParent"}>Reference to Parent</option>
                  <option value="RefToChild" selected=${reference.ref_kind == "RefToChild"}>Reference to Child</option>
                  <option value="RefInContrast" selected=${reference.ref_kind == "RefInContrast"}>Contrasting Reference</option>
                  <option value="RefCritical" selected=${reference.ref_kind == "RefCritical"}>Critical Reference</option>
                </select>
                <span class="civsel-name">${reference.name}</span>
                <input class="civsel-annotation"
                  type="text"
                  name="annotation"
                  value=${ reference.annotation }
                  onInput=${ handleChangeEvent } />
              </div>`;
}

function Input({ text, onTextChanged, onAdd, onCreate, candidates, currentSelection, showKeyboardShortcuts }) {
  function onInput(e) {
    onTextChanged(e.target.value);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (text.length > 0) {
      // search for text in available
      // let existingOption = available.find(option => { return option.name === text;});
      if (false) {
        // pre-existing deck
        onAdd(existingOption);
      } else {
        // treat this text as a new idea that needs to be created
        onCreate({ name: text, resource: "ideas", ref_kind: "Ref", annotation: null });
      }
    }
  }

  let cl = candidates.map((c, i) => {
    return html`<${CandidateItem} candidate=${c}
                                  onSelectedCandidate=${ onAdd }
                                  showKeyboardShortcuts=${ showKeyboardShortcuts }
                                  keyIndex=${ i }
                />`;
  });

  return html`
    <form class="civsel-form" onSubmit=${ onSubmit }>
      <input
        type='text'
        value='${ text }'
        autoComplete='off'
        onInput=${ onInput }
      />
      <div class='civsel-candidates'>${ cl }</div>
    </form>`;
}

function CandidateItem({ candidate, onSelectedCandidate, showKeyboardShortcuts, keyIndex }) {
  function selectedThisCandidate(e) {
    onSelectedCandidate(candidate);
    e.preventDefault();
  }

  const maxShortcuts = 9 + 26;  // 1..9 and a..z

  const canShowKeyboardShortcut = showKeyboardShortcuts && keyIndex < maxShortcuts;

  return html`<div class="civsel-candidate pigment-${candidate.resource}" onClick=${selectedThisCandidate}>
                ${ canShowKeyboardShortcut && html`<span class='keyboard-shortcut'>${ indexToShortcut(keyIndex)}: </span>`}
                ${ candidate.name }
              </div>`;
}
