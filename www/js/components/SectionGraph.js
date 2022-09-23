import { html } from '/lib/preact/mod.js';
import { useStateValue } from '/js/StateProvider.js';
import Graph from '/js/components/Graph.js';
import RollableSection from '/js/components/RollableSection.js';

        // PERSON
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready
        // const okToShowGraph = !!(deckManager.hasNotes || (person.backrefs && person.backrefs.length > 0));

        // ARTICLE
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready
        // const okToShowGraph = deckManager.hasNotes;

        // TIMELINE
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready
        // const okToShowGraph = !!(deckManager.hasNotes || (timeline.backrefs && timeline.backrefs.length > 0));

        // IDEA
        //
        // this is only for presentational purposes
        // there's normally an annoying flash of the vis graph whilst a deck is still fetching the notes that will be shown before the vis.
        // this check prevents the vis from rendering until after we have all the note and links ready


export default function SectionGraph({ depth }) {
    const [state] = useStateValue();

    if (state.showConnectivityGraph && state.sigs.deckManagerState.value.deck) {
        let deck = state.sigs.deckManagerState.value.deck;
        const okToShowGraph = (deck.notes && deck.notes.length > 0) || deck.backrefs;
        const heading = (deck.title) ? `Connectivity Graph` : '';

        return html`
        <${RollableSection} heading=${ heading } initiallyRolledUp>
            ${ okToShowGraph && html`<${Graph} id=${ deck.id } depth=${ depth }/>`}
        </${RollableSection}>`;
    } else {
        return html`<div></div>`;
    }
}
