import { useEffect } from "preact/hooks";

import { DeckKind, RefKind, RenderingDeckPart } from "../enums";
import type {
    Key,
    Reference,
    ReferencesApplied,
    ReferencesDiff,
    SearchResults,
    SlimDeck,
    State,
} from "../types";

import { AppStateChange, getAppState, immutableState } from "../app-state";

import { indexToShortcut } from "../shared/command";
import {
    deckKindToResourceString,
    sortByDeckKindThenName,
} from "../shared/deck";
import { fontClass } from "../shared/font";
import { indexFromCode } from "../shared/keys";
import Net from "../shared/net";
import { stringToRefKind } from "../shared/ref-kind";

import CivilInput from "./civil-input";
import { CivMain, CivRight } from "./civil-layout";
import { renderInsignia } from "./insignia-renderer";
import { svgCloseShifted } from "./svg-icons";
import useLocalReducer from "./use-local-reducer";

enum ActionType {
    AbsorbInput,
    CandidatesSet,
    CtrlKeyDown,
    CtrlKeyUp,
    EscKeyDown,
    InputGiven,
    ReferenceChangeAnnotation,
    ReferenceChangeKind,
    ReferenceRemove,
    SelectAdd,
    SelectCreate,
    ShortcutCheck,
}

type ActionDataReferenceChangeKind = {
    reference: Reference;
    newKind: RefKind;
};

type ActionDataReferenceChangeAnnotation = {
    reference: Reference;
    annotation: string;
};

type ActionDataShortcutCheck = {
    key: string;
    code: string;
    appState: State;
};

type Action = {
    type: ActionType;
    data?:
        | string
        | number
        | Reference
        | SlimDeck
        | SlimDeck[]
        | ActionDataReferenceChangeKind
        | ActionDataReferenceChangeAnnotation
        | ActionDataShortcutCheck;
};

type LocalState = {
    currentSelection: Array<Reference>;
    referencesUnchanged: Array<Reference>;
    referencesChanged: Array<Reference>;
    referencesRemoved: Array<Reference>;
    referencesAdded: Array<Reference>;
    referencesCreated: Array<Reference>;
    text: string;
    showKeyboardShortcuts: boolean;
    candidates: Array<SlimDeck>;
    canSave: boolean;
    nakedCtrlPress: boolean;
    justAddedViaShortcut: boolean;
};

let gCivilSelectAbortController = new AbortController();

function candidateToAddedRef(candidate: SlimDeck): Reference {
    return {
        id: candidate.id,
        title: candidate.title,
        deckKind: candidate.deckKind,
        createdAt: candidate.createdAt,
        graphTerminator: candidate.graphTerminator,
        refKind: RefKind.Ref,
        noteId: 0, // this noteId isn't used when adding a ref
        insignia: candidate.insignia,
        font: candidate.font,
        impact: candidate.impact,
    };
}

function rebuildCurrentSelection(state: LocalState): LocalState {
    state.currentSelection = state.referencesUnchanged.concat(
        state.referencesChanged,
        state.referencesAdded,
        state.referencesCreated,
    );
    state.currentSelection.sort(sortByDeckKindThenName);
    return state;
}

function reducer(state: LocalState, action: Action): LocalState {
    switch (action.type) {
        case ActionType.EscKeyDown:
            return {
                ...state,
                candidates: [],
            };
        case ActionType.CtrlKeyDown: {
            const newState = {
                ...state,
                nakedCtrlPress: true,
            };
            return newState;
        }
        case ActionType.CtrlKeyUp: {
            const newState = {
                ...state,
            };

            if (state.nakedCtrlPress) {
                newState.nakedCtrlPress = false;
                if (
                    !state.showKeyboardShortcuts /*&& state.candidates.length */
                ) {
                    newState.showKeyboardShortcuts = true;
                } else {
                    newState.showKeyboardShortcuts = false;
                }
            }

            return newState;
        }
        case ActionType.ShortcutCheck: {
            if (state.showKeyboardShortcuts) {
                let data = action.data as ActionDataShortcutCheck;
                let key = data.key;
                if ((key >= "1" && key <= "9") || (key >= "a" && key <= "z")) {
                    const code = data.code;
                    const index = indexFromCode(code);

                    let deck: SlimDeck | undefined = undefined;

                    if (state.text.length === 0) {
                        // shortcut to add from recently used decks
                        const appState = data.appState;
                        let recentValid = recentValidDecks(state, appState);

                        deck = recentValid[index];
                    } else if (state.candidates.length > index) {
                        // shortcut to add from autocomplete candidates
                        deck = state.candidates[index];
                    }

                    if (deck) {
                        const newState = reducer(state, {
                            type: ActionType.SelectAdd,
                            data: deck,
                        });

                        newState.nakedCtrlPress = false;
                        newState.showKeyboardShortcuts = false;
                        newState.justAddedViaShortcut = true;

                        return newState;
                    }
                }
            }
            return {
                ...state,
                nakedCtrlPress: false,
            };
        }
        case ActionType.ReferenceRemove: {
            let newState = { ...state };
            let refToRemove = action.data as Reference;

            if (
                state.referencesUnchanged.find((r) => r.id === refToRemove.id)
            ) {
                // remove from the referencesUnchanged and add into referencesRemoved
                newState.referencesUnchanged =
                    newState.referencesUnchanged.filter((r) => {
                        return r.id !== refToRemove.id;
                    });
                newState.referencesRemoved.push(refToRemove);
            } else if (
                state.referencesChanged.find((r) => r.id === refToRemove.id)
            ) {
                // remove from the referencesChanged and add into referencesRemoved
                newState.referencesChanged = newState.referencesChanged.filter(
                    (r) => {
                        return r.id !== refToRemove.id;
                    },
                );
                newState.referencesRemoved.push(refToRemove);
            } else if (
                state.referencesAdded.find((r) => r.id === refToRemove.id)
            ) {
                newState.referencesAdded = newState.referencesAdded.filter(
                    (r) => {
                        return r.id !== refToRemove.id;
                    },
                );
            } else if (
                state.referencesCreated.find((r) => r.id === refToRemove.id)
            ) {
                newState.referencesCreated = newState.referencesCreated.filter(
                    (r) => {
                        return r.id !== refToRemove.id;
                    },
                );
            }

            newState.canSave = true;

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.ReferenceChangeKind: {
            let newState = { ...state };

            let data = action.data as ActionDataReferenceChangeKind;
            let refToChangeKind = data.reference;

            let found = state.referencesUnchanged.find(
                (r) => r.id === refToChangeKind.id,
            );
            if (found) {
                // move from unchanged to changed
                newState.referencesUnchanged = state.referencesUnchanged.filter(
                    (r) => r.id !== found!.id,
                );
                newState.referencesChanged.push(found);
            }
            if (!found) {
                found = state.referencesChanged.find(
                    (r) => r.id === refToChangeKind.id,
                );
            }
            if (!found) {
                found = state.referencesAdded.find(
                    (r) => r.id === refToChangeKind.id,
                );
            }
            if (!found) {
                found = state.referencesCreated.find(
                    (r) => r.id === refToChangeKind.id,
                );
            }

            if (found) {
                found.refKind = data.newKind;
            }

            newState.canSave = true;

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.ReferenceChangeAnnotation: {
            let newState = { ...state };

            let data = action.data as ActionDataReferenceChangeAnnotation;
            let refToChangeAnnotation = data.reference;

            let found = state.referencesUnchanged.find(
                (r) => r.id === refToChangeAnnotation.id,
            );
            if (found) {
                // move from unchanged to changed
                newState.referencesUnchanged = state.referencesUnchanged.filter(
                    (r) => r.id !== found!.id,
                );
                newState.referencesChanged.push(found);
            }
            if (!found) {
                found = state.referencesChanged.find(
                    (r) => r.id === refToChangeAnnotation.id,
                );
            }
            if (!found) {
                found = state.referencesAdded.find(
                    (r) => r.id === refToChangeAnnotation.id,
                );
            }
            if (!found) {
                found = state.referencesCreated.find(
                    (r) => r.id === refToChangeAnnotation.id,
                );
            }

            if (found) {
                found.annotation = data.annotation;
            }

            newState.canSave = true;

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.SelectAdd: {
            let newState = { ...state };

            let data = action.data as SlimDeck;

            let refToAdd = candidateToAddedRef(data);

            newState.referencesAdded.push(refToAdd);

            newState.canSave = true;
            newState.text = "";
            newState.candidates = [];

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.SelectCreate: {
            let newState = { ...state };

            let refToCreate = action.data as Reference;

            newState.referencesCreated.push(refToCreate);

            newState.canSave = true;
            newState.text = "";

            newState = rebuildCurrentSelection(newState);

            return newState;
        }
        case ActionType.CandidatesSet:
            return {
                ...state,
                candidates: action.data as SlimDeck[],
            };
        case ActionType.AbsorbInput:
            return {
                ...state,
                justAddedViaShortcut: false,
            };
        case ActionType.InputGiven: {
            return {
                ...state,
                justAddedViaShortcut: false,
                showKeyboardShortcuts: false,
                text: action.data as string,
            };
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

export default function CivilSelect({
    extraClasses,
    parentDeckId,
    noteId,
    chosen,
    onSave,
    onCancel,
}: {
    extraClasses?: string;
    parentDeckId: Key;
    noteId: Key;
    chosen: Array<Reference>;
    onSave: (changes: ReferencesDiff, refsInNote: Array<Reference>) => void;
    onCancel: () => void;
}) {
    const appState = getAppState();

    const s: LocalState = {
        currentSelection: [], // built by rebuildCurrentSelection

        // make copies of each of the chosen, otherwise cancelling after making edits still shows up on the parent Note
        // (this is because [...chosen] doesn't deep copy the elements of the array)
        referencesUnchanged: (chosen || []).map((ref) =>
            Object.assign({}, ref),
        ),
        referencesChanged: [],
        referencesRemoved: [],
        referencesAdded: [],
        referencesCreated: [],

        text: "",

        showKeyboardShortcuts: false,
        candidates: [],
        canSave: false,
        nakedCtrlPress: false,
        justAddedViaShortcut: false,
    };
    const [local, localDispatch] = useLocalReducer<LocalState, ActionType>(
        reducer,
        rebuildCurrentSelection(s),
    );

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            localDispatch(ActionType.EscKeyDown);
        }
        if (e.key === "Control") {
            localDispatch(ActionType.CtrlKeyDown, e);
        } else {
            localDispatch(ActionType.ShortcutCheck, {
                key: e.key,
                code: e.code,
                appState,
            });
        }
    };

    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Control") {
            localDispatch(ActionType.CtrlKeyUp, e);
        }
    };

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    function onFinish(changes: ReferencesDiff) {
        let changeData: ReferencesDiff = {
            referencesChanged: changes.referencesChanged,
            referencesRemoved: changes.referencesRemoved,
            referencesAdded: changes.referencesAdded,
            referencesCreated: changes.referencesCreated,
        };

        Net.put<ReferencesDiff, ReferencesApplied>(
            `/api/notes/${noteId}/references`,
            changeData,
        ).then((response) => {
            const recents = response.recents;
            AppStateChange.setRecentlyUsedDecks({ recents });
            onSave(changes, response.refs);
        });
    }

    function onTextChanged(newText: string) {
        if (
            local.justAddedViaShortcut &&
            newText.length === 1 &&
            newText >= "0" &&
            newText <= "9"
        ) {
            localDispatch(ActionType.CandidatesSet, []);
            localDispatch(ActionType.AbsorbInput);
        } else {
            refineCandidates(newText);
            localDispatch(ActionType.InputGiven, newText);
        }
    }

    function alreadySelected(title: string) {
        return local.currentSelection.some((cv) => {
            return cv.title === title;
        });
    }

    async function refineCandidates(newText: string) {
        try {
            gCivilSelectAbortController.abort();

            if (newText.length > 0) {
                gCivilSelectAbortController = new AbortController();
                const url = `/api/search/names?q=${encodeURI(newText)}`;

                const searchResponse = await Net.getAbortable<SearchResults>(
                    url,
                    gCivilSelectAbortController.signal,
                );
                if (searchResponse.deckLevel) {
                    const newCandidates = searchResponse.deckLevel
                        .map((searchDeck) => searchDeck.deck)
                        .filter((slimDeck) => {
                            return (
                                slimDeck.id !== parentDeckId &&
                                !alreadySelected(slimDeck.title)
                            );
                        })
                        .sort((a, b) => {
                            return a.title.length - b.title.length;
                        });
                    localDispatch(ActionType.CandidatesSet, newCandidates);
                }
            } else {
                localDispatch(ActionType.CandidatesSet, []);
            }
        } catch (e) {
            // this catches the exception thrown when abort is invoked
            // console.log(e)
        }
    }

    function onLocalCancel() {
        onCancel();
    }

    function onLocalCommit() {
        const refsModified: ReferencesDiff = {
            referencesChanged: local.referencesChanged,
            referencesRemoved: local.referencesRemoved,
            referencesAdded: local.referencesAdded,
            referencesCreated: local.referencesCreated,
        };
        onFinish(refsModified);
    }

    let topLevelClasses = "ui";
    if (extraClasses) {
        topLevelClasses += " " + extraClasses;
    }

    return (
        <CivMain extraClasses={topLevelClasses}>
            <label>References:</label>
            <RecentDecks
                localState={local}
                onAdd={(recentDeck) =>
                    localDispatch(ActionType.SelectAdd, recentDeck)
                }
            />
            {local.currentSelection.map((value) => (
                <SelectedReference
                    reference={value}
                    onRemove={(e) =>
                        localDispatch(ActionType.ReferenceRemove, e)
                    }
                    onChangeKind={(reference: Reference, newKind: RefKind) =>
                        localDispatch(ActionType.ReferenceChangeKind, {
                            reference,
                            newKind,
                        })
                    }
                    onChangeAnnotation={(
                        reference: Reference,
                        annotation: string,
                    ) =>
                        localDispatch(ActionType.ReferenceChangeAnnotation, {
                            reference,
                            annotation,
                        })
                    }
                />
            ))}
            <CivilSelectInput
                text={local.text}
                onTextChanged={onTextChanged}
                candidates={local.candidates}
                onAdd={(existingDeck) => {
                    localDispatch(ActionType.SelectAdd, existingDeck);
                }}
                onCreate={(shouldBeProtoReference) => {
                    localDispatch(
                        ActionType.SelectCreate,
                        shouldBeProtoReference,
                    );
                }}
                showKeyboardShortcuts={local.showKeyboardShortcuts}
            />
            <button onClick={onLocalCancel}>Cancel</button>
            <button onClick={onLocalCommit} disabled={!local.canSave}>
                {local.showKeyboardShortcuts && `Ctrl-Enter`} Save Changes
            </button>
        </CivMain>
    );
}

function recentValidDecks(
    localState: LocalState,
    appState: State,
): Array<SlimDeck> {
    function alreadyAdded(sd: SlimDeck): boolean {
        // have to check title rather than id in case one of the added decks
        // has been newly created (it won't have an id)
        //
        return localState.currentSelection.some((x) => x.title === sd.title);
    }

    const recent = appState.recentlyUsedDecks.value.filter(
        (rd) => !alreadyAdded(rd),
    );

    return recent;
}

function RecentDecks({
    localState,
    onAdd,
}: {
    localState: LocalState;
    onAdd: (deck?: SlimDeck) => void;
}) {
    const appState = getAppState();

    const showShortcut =
        localState.showKeyboardShortcuts && localState.candidates.length === 0;

    function buildRecent(slimDeck: SlimDeck, index: number) {
        const dk: string = deckKindToResourceString(slimDeck.deckKind);

        let klass = fontClass(slimDeck.font, RenderingDeckPart.UiInterleaved);
        klass += ` civsel-recent-deck pigment-fg-${dk}`;

        return (
            <li class={klass} onClick={() => onAdd(slimDeck)}>
                {showShortcut && `${index + 1}: `}
                {renderInsignia(slimDeck.insignia)}
                {slimDeck.title}
            </li>
        );
    }

    const recent = recentValidDecks(localState, appState).map(buildRecent);

    return (
        <CivRight extraClasses="c-recent-decks">
            {!!recent.length && <div>Recently Used Refs:</div>}
            <ul>{recent}</ul>
        </CivRight>
    );
}

type SelectedReferenceProps = {
    reference: Reference;
    onRemove: (r: Reference) => void;
    onChangeKind: (r: Reference, rk: RefKind) => void;
    onChangeAnnotation: (r: Reference, s: string) => void;
};

function SelectedReference({
    reference,
    onRemove,
    onChangeKind,
    onChangeAnnotation,
}: SelectedReferenceProps) {
    function onClick(e: Event) {
        e.preventDefault();
        onRemove(reference);
    }

    function onKindDropDownSelect(e: Event) {
        if (e.target instanceof HTMLSelectElement) {
            let refkind: RefKind | undefined = stringToRefKind(e.target.value);
            if (refkind) {
                onChangeKind(reference, refkind);
            } else {
                console.error(`invalid refkind string: ${refkind} ???`);
            }
        }
    }

    function handleContentChange(content: string) {
        onChangeAnnotation(reference, content);
    }

    let topclass = `c-selected-reference pigment-${deckKindToResourceString(
        reference.deckKind,
    )}`;

    return (
        <div class={topclass}>
            <span class="civsel-delete-selected" onClick={onClick}>
                {svgCloseShifted()}
            </span>
            <select onChange={onKindDropDownSelect} name="choice">
                <option value="Ref" selected={reference.refKind == RefKind.Ref}>
                    Generic Reference
                </option>
                <option
                    value="RefToParent"
                    selected={reference.refKind == RefKind.RefToParent}
                >
                    Reference to Parent
                </option>
                <option
                    value="RefToChild"
                    selected={reference.refKind == RefKind.RefToChild}
                >
                    Reference to Child
                </option>
                <option
                    value="RefInContrast"
                    selected={reference.refKind == RefKind.RefInContrast}
                >
                    Contrasting Reference
                </option>
                <option
                    value="RefCritical"
                    selected={reference.refKind == RefKind.RefCritical}
                >
                    Critical Reference
                </option>
            </select>
            <span class="civsel-name">{reference.title}</span>
            <CivilInput
                elementClass="civsel-annotation"
                id="annotation"
                value={reference.annotation || ""}
                onContentChange={handleContentChange}
            />
        </div>
    );
}

type CivilSelectInputProps = {
    text: string;
    onTextChanged: (s: string) => void;
    onAdd: (c: SlimDeck) => void;
    onCreate: (r: Reference) => void;
    candidates: Array<SlimDeck>;
    showKeyboardShortcuts: boolean;
};

function CivilSelectInput({
    text,
    onTextChanged,
    onAdd,
    onCreate,
    candidates,
    showKeyboardShortcuts,
}: CivilSelectInputProps) {
    function onSubmit(e: Event) {
        e.preventDefault();
        if (text.length > 0) {
            // treat this text as a new idea that needs to be created
            //
            // should really be a ProtoReference, but there's a concat
            // above which expects everything to be a Reference
            //
            let r: Reference = {
                id: 0,
                createdAt: "",
                noteId: 0,
                title: text,
                deckKind: DeckKind.Idea,
                graphTerminator: false,
                refKind: RefKind.Ref,
                insignia: 0,
                font: immutableState.defaultFont,
                impact: 0,
            };
            onCreate(r);
        }
    }

    let cl = candidates.map((c, i) => {
        return (
            <CandidateItem
                candidate={c}
                onSelectedCandidate={onAdd}
                showKeyboardShortcuts={showKeyboardShortcuts}
                keyIndex={i}
            />
        );
    });

    function onContentChange(s: string) {
        if (!showKeyboardShortcuts) {
            onTextChanged(s);
        }
    }

    return (
        <form class="c-civil-select-input civsel-name" onSubmit={onSubmit}>
            <CivilInput
                value={text}
                focus
                autoComplete="off"
                onContentChange={onContentChange}
            />
            {cl}
        </form>
    );
}

type CandidateItemProps = {
    candidate: SlimDeck;
    onSelectedCandidate: (c: SlimDeck) => void;
    showKeyboardShortcuts: boolean;
    keyIndex: number;
};

function CandidateItem({
    candidate,
    onSelectedCandidate,
    showKeyboardShortcuts,
    keyIndex,
}: CandidateItemProps) {
    function selectedThisCandidate(e: Event) {
        onSelectedCandidate(candidate);
        e.preventDefault();
    }

    const maxShortcuts = 9 + 26; // 1..9 and a..z

    const canShowKeyboardShortcut =
        showKeyboardShortcuts && keyIndex < maxShortcuts;

    const topclass = `c-candidate-item pigment-${deckKindToResourceString(
        candidate.deckKind,
    )}`;
    return (
        <div class={topclass} onClick={selectedThisCandidate}>
            {canShowKeyboardShortcut && (
                <span class="keyboard-shortcut">
                    {indexToShortcut(keyIndex)}:{" "}
                </span>
            )}
            {candidate.title}
        </div>
    );
}
