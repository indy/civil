import { html } from '/lib/preact/mod.js';

import { LazyLoadedListSection } from '/js/components/ListSections.js';

export default function Stuff() {
    return html`
    <article>
      <${LazyLoadedListSection} label='Recently Visited' url='/api/stats/recently_visited'/>
    </article>`;
}
