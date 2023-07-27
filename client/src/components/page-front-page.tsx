import { h } from "preact";

import { getAppState } from "app-state";

import { IdeasModule } from "components/page-ideas";
import { PeopleModule } from "components/page-people";
import { ArticlesModule } from "components/page-articles";
import { TimelinesModule } from "components/page-timelines";
import { DialoguesModule } from "components/page-dialogues";
import { QuotesModule } from "components/page-quotes";

import InsigniaGrouping from "components/insignia-grouping";
import { LazyLoadedGrouping } from "components/groupings";
import { CivContainer, CivMain } from "components/civil-layout";

export default function FrontPage({ path }: { path?: string }) {
    const appState = getAppState();

    const ideas = appState.listing.value.ideas;
    const people = appState.listing.value.people;
    const articles = appState.listing.value.articles;
    const timelines = appState.listing.value.timelines;
    const dialogues = appState.listing.value.dialogues;

    if (ideas && people && articles && timelines && dialogues) {
        return (
            <div>
                <FilterModule />
                <DialoguesModule dialogues={dialogues} />
                <IdeasModule ideas={ideas} />
                <ArticlesModule articles={articles} />
                <PeopleModule people={people} />
                <TimelinesModule timelines={timelines} />
                <QuotesModule />
            </div>
        );
    } else {
        return <div></div>;
    }
}

function FilterModule() {
    return (
        <article class="module">
            <CivContainer>
                <CivMain>
                    <span class="module-top-part">
                        <span class="module-top-part-buttons"></span>
                        <h1 class="ui">Filters</h1>
                    </span>
                    <LazyLoadedGrouping
                        label="Recently Visited"
                        url="/api/decks/recently_visited"
                    />
                    <InsigniaGrouping label="Insignias" />
                </CivMain>
            </CivContainer>
        </article>
    );
}
