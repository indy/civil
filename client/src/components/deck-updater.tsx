import { useEffect, useState } from "preact/hooks";

import { Font } from "../enums";
import type { FatDeck, ProtoSlimDeck, SlimDeck } from "../types";

import {
    deckKindToResourceString,
    deckKindToSingularString,
} from "../shared/deck";
import { capitalise } from "../shared/english";
import { impactAsText } from "../shared/impact";
import Net from "../shared/net";

import CivilButton from "./civil-button";
import CivilInput from "./civil-input";
import { CivForm, CivLeftLabel, CivMain, CivRight } from "./civil-layout";
import FontSelector from "./font-selector";
import InsigniaSelector from "./insignia-selector";

type DeckUpdaterProps<T extends FatDeck> = {
    deck: SlimDeck;
    onUpdate: (d: T) => void;
    onCancel: () => void;
};

// a generic deck updater used by deck kinds that only
// need to update basic properties shared by all decks
// (e.g. Ideas, People, Timelines)
//
const DeckUpdater = <T extends FatDeck>({
    deck,
    onUpdate,
    onCancel,
}: DeckUpdaterProps<T>) => {
    const [localState, setLocalState] = useState<ProtoSlimDeck>({
        title: deck.title,
        deckKind: deck.deckKind,
        graphTerminator: deck.graphTerminator,
        insignia: deck.insignia,
        font: deck.font,
        impact: deck.impact,
    });

    useEffect(() => {
        setLocalState(prev => ({
            ...prev,
            title: deck.title,
            graphTerminator: deck.graphTerminator,
            insignia: deck.insignia,
            font: deck.font,
            impact: deck.impact,
        }));
    }, [deck]);

    function handleContentChange(title: string) {
        setLocalState(prev => ({
            ...prev,
            title,
        }));
    }

    function handleSubmit(event: Event) {
        const data: ProtoSlimDeck = { ...localState };
        data.title = data.title.trim();

        const resource = deckKindToResourceString(deck.deckKind);

        Net.put<ProtoSlimDeck, T>(`/api/${resource}/${deck.id}`, data).then(
            (newDeck) => {
                onUpdate(newDeck);
            },
        );

        event.preventDefault();
    }

    function handleCheckbox(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            if (event.target.id === "graph-terminator") {
                setLocalState(prev => ({
                    ...prev,
                    graphTerminator: !localState.graphTerminator,
                }));
            }
        }
    }

    function setInsignia(insignia: number) {
        setLocalState(prev => ({
            ...prev,
            insignia,
        }));
    }

    function setFont(font: Font) {
        setLocalState(prev => ({
            ...prev,
            font,
        }));
    }

    function onImpactChange(event: Event) {
        if (event.target instanceof HTMLInputElement) {
            const n = (event.target as HTMLInputElement).valueAsNumber;
            setLocalState(prev => ({
                ...prev,
                impact: n,
            }));
        }
    }

    const submitButtonText =
        "Update " + capitalise(deckKindToSingularString(deck.deckKind));

    return (
        <CivForm onSubmit={handleSubmit}>
            <CivLeftLabel forId="title">Title</CivLeftLabel>
            <CivMain>
                <CivilInput
                    id="title"
                    value={localState.title}
                    onContentChange={handleContentChange}
                />
            </CivMain>

            <CivLeftLabel extraClasses="icon-left-label">
                Insignias
            </CivLeftLabel>
            <CivMain>
                <InsigniaSelector
                    insigniaId={localState.insignia}
                    onChange={setInsignia}
                />
            </CivMain>

            <CivLeftLabel
                extraClasses="graph-terminator-form-label"
                forId="graph-terminator"
            >
                Graph Terminator
            </CivLeftLabel>
            <CivMain>
                <input
                    type="checkbox"
                    id="graph-terminator"
                    name="graph-terminator"
                    onInput={handleCheckbox}
                    checked={localState.graphTerminator}
                />
            </CivMain>

            <CivLeftLabel>Font</CivLeftLabel>
            <CivMain>
                <FontSelector font={localState.font} onChangedFont={setFont} />
            </CivMain>

            <CivLeftLabel>Impact</CivLeftLabel>
            <CivMain>
                <input
                    type="range"
                    min="0"
                    max="4"
                    value={localState.impact}
                    class="slider"
                    id="impactSlider"
                    onInput={onImpactChange}
                />
                <CivRight>{impactAsText(localState.impact)}</CivRight>
            </CivMain>

            <div class="vertical-spacer"></div>

            <CivMain>
                <CivilButton extraClasses="dialog-cancel" onClick={onCancel}>
                    Cancel
                </CivilButton>
                <input
                    class="c-civil-button"
                    type="submit"
                    value={submitButtonText}
                />
            </CivMain>
        </CivForm>
    );
};

export default DeckUpdater;
