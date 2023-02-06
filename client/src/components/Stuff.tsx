import { h } from "preact";

import { LazyLoadedListSection } from './ListSections';

export default function Stuff({ path }: { path?: string }) {
    return (
    <article>
      <LazyLoadedListSection label='Recently Visited' url='/api/stats/recently_visited'/>
    </article>);
}
