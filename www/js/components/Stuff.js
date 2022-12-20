import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';

export default function Stuff() {

    let [localState, setLocalState] = useState({
        fetchedStats: false,
        stats: {}
    });

    function onToggleStats(visible) {
        if (visible && !localState.fetchedStats) {
            Net.get('/api/stats').then(s => {
                setLocalState({
                    ...localState,
                    fetchedStats: true,
                    stats: s
                });
            });
        }
    }

    return html`
    <article>
        <h1 class="ui">Stats</h1>
        <${DeckSimpleListSection} label='Recently Visited' list=${ localState.stats.recentlyVisited } onToggle=${onToggleStats}/>
    </article>`;
}
