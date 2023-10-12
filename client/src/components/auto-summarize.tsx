import { NoteKind, WaitingFor } from "../enums";
import type { FatDeck, Note } from "../types";

import { AppStateChange, getAppState } from "../app-state";

import Net from "../shared/net";

import buildSimplifiedText from "./build-simplified-text";
import CivilButton from "./civil-button";

type AutoSummarizeProps = {
    deck: FatDeck;
    onFinish: (n: Note) => void;
};

export default function AutoSummarize({ deck, onFinish }: AutoSummarizeProps) {
    const appState = getAppState();
    const wasmInterface = appState.wasmInterface!;

    function onClick() {
        if (deck.passage[NoteKind.Note]) {
            let textPassage = deck.passage[NoteKind.Note].map((n) =>
                buildSimplifiedText(n.content, wasmInterface),
            );
            let textPassageContent = textPassage.join("\n");

            let summaryPassage = deck.passage[NoteKind.NoteSummary];
            let prevId: number | undefined = undefined;
            if (summaryPassage.length > 0) {
                // this deck already contains a note summary passage, so append the auto summarize
                prevId = summaryPassage[summaryPassage.length - 1]!.id;
            }

            type SummarizeStruct = {
                prevId?: number;
                content: string;
            };

            let summarizeStruct: SummarizeStruct = {
                prevId,
                content: textPassageContent,
            };

            // returns the newly created NoteSummary
            AppStateChange.setWaitingFor({ waitingFor: WaitingFor.Server });
            Net.post<SummarizeStruct, Note>(
                `/api/decks/summarize/${deck.id}`,
                summarizeStruct,
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
