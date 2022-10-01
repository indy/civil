import { html, useState, useEffect } from '/lib/preact/mod.js';

import Net from '/js/Net.js';
import { DeckSimpleListSection } from '/js/components/ListSections.js';

export default function Stats(props) {

    let [stats, setStats] = useState({});

    useEffect(() => {
        Net.get('/api/stats').then(s => {
            console.log(s);
            setStats(s);
        });
    }, []);

    return html`
    <article>
        <h1 class="ui">Stats</h1>
        <${DeckSimpleListSection} label='Recently Visited' list=${ stats.recentlyVisited } expanded/>
    </article>`;
}
