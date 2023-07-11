import { h } from "preact";

import { FatDeck, Note } from "types";
import { getAppState } from "app-state";
import Net from "utils/net";
import buildSimplifiedText from "components/notes/build-simplified-text";

type AutoSummarizeProps = {
    deck: FatDeck;
    onFinish: (n: Note) => void;
};

export default function AutoSummarize({ deck, onFinish }: AutoSummarizeProps) {
    const appState = getAppState();
    const wasmInterface = appState.wasmInterface!;

    function onClick() {
        if (deck.noteSeqs) {
            let text = deck.noteSeqs.note.map((n) => buildSimplifiedText(n.content, wasmInterface));
            let textPassage = text.join("\n");

            let summarySeq = deck.noteSeqs.noteSummary;
            let prevId: number | undefined = undefined;
            if (summarySeq.length > 0) {
                // this deck already contains a note summary passage, so append the auto summarize
                prevId = summarySeq[summarySeq.length - 1].id;
            }

            type SummarizeStruct = {
                prevId?: number,
                content: string
            };

            let summarizeStruct: SummarizeStruct = {
                prevId,
                content: textPassage,
            };

            // returns the newly created NoteSummary
            Net.post<SummarizeStruct, Note>(`/api/decks/summarize/${deck.id}`, summarizeStruct).then((note) => {
                onFinish(note);
            });
        }
    }

    return <button onClick={onClick}>Auto Summarize</button>;
}
