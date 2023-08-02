import { h } from "preact";

import { FatDeck, Note, WaitingFor } from "types";

import { AppStateChange, getAppState } from "app-state";

import Net from "shared/net";

import CivilButton from "components/civil-button";
import buildSimplifiedText from "components/build-simplified-text";

type AutoSummarizeProps = {
    deck: FatDeck;
    onFinish: (n: Note) => void;
};

export default function AutoSummarize({ deck, onFinish }: AutoSummarizeProps) {
    const appState = getAppState();
    const wasmInterface = appState.wasmInterface!;

    function onClick() {
        if (deck.noteSeqs) {
            let text = deck.noteSeqs.note.map((n) =>
                buildSimplifiedText(n.content, wasmInterface)
            );
            let textPassage = text.join("\n");

            let summarySeq = deck.noteSeqs.noteSummary;
            let prevId: number | undefined = undefined;
            if (summarySeq.length > 0) {
                // this deck already contains a note summary passage, so append the auto summarize
                prevId = summarySeq[summarySeq.length - 1].id;
            }

            type SummarizeStruct = {
                prevId?: number;
                content: string;
            };

            let summarizeStruct: SummarizeStruct = {
                prevId,
                content: textPassage,
            };

            // returns the newly created NoteSummary
            AppStateChange.setWaitingFor({ waitingFor: WaitingFor.Server });
            Net.post<SummarizeStruct, Note>(
                `/api/decks/summarize/${deck.id}`,
                summarizeStruct
            )
                .then((note) => {
                    AppStateChange.setWaitingFor({
                        waitingFor: WaitingFor.User,
                    });
                    onFinish(note);
                })
                .catch((error) => {
                    AppStateChange.setWaitingFor({
                        waitingFor: WaitingFor.User,
                    });
                    console.log("caught something");
                    console.log(error);
                });
        }
    }

    return <CivilButton onClick={onClick}>Auto Summarize</CivilButton>;
}
