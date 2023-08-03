import { h } from "preact";
import { Link } from "preact-router";

import { AppStateChange, getAppState, immutableState } from "app-state";

import { capitalise } from "shared/english";

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
                <TopBarMenu />
                <FilterModule />
                <IdeasModule ideas={ideas} />
                <ArticlesModule articles={articles} />
                <PeopleModule people={people} />
                <DialoguesModule dialogues={dialogues} />
                <QuotesModule />
                <TimelinesModule timelines={timelines} />
            </div>
        );
    } else {
        return <div></div>;
    }
}

function TopBarMenu() {
    const appState = getAppState();

    function loggedStatus() {
        let status = "";

        let user = appState.user;
        if (user.value) {
            status += user.value.username;
            if (user.value.admin && user.value.admin.dbName !== "civil") {
                status += ` (${user.value.admin.dbName})`;
            }
        } else {
            status = "Login";
        }

        return status;
    }

    function loggedLink() {
        return appState.user.value ? "/account-settings" : "/login";
    }

    function clickedTopLevel(topMenuItem: string) {
        AppStateChange.urlTitle({ title: topMenuItem });
    }

    function menuItemText(topMenuItem: string): string {
        if (topMenuItem === "memorise") {
            return `Memorise(${appState.memoriseReviewCount.value})`;
        } else {
            return capitalise(topMenuItem);
        }
    }

    function menuItemClass(topMenuItem: string): string {
        if (
            topMenuItem === "memorise" &&
            appState.memoriseReviewCount.value > 0
        ) {
            return `pigment-${topMenuItem}-active`;
        } else {
            return `pigment-${topMenuItem}`;
        }
    }

    return (
        <nav>
            <div id="elastic-top-menu-items">
                {immutableState.topMenuOrder.map((topMenuItem) => (
                    <div class="top-menu-item">
                        <Link
                            class={menuItemClass(topMenuItem)}
                            onClick={() => {
                                clickedTopLevel(topMenuItem);
                            }}
                            href={`/${topMenuItem}`}
                        >
                            {menuItemText(topMenuItem)}
                        </Link>
                    </div>
                ))}

                <div>
                    <Link class="pigment-inherit" href={loggedLink()}>
                        {loggedStatus()}
                    </Link>
                </div>
            </div>
        </nav>
    );
}

function FilterModule() {
    return (
        <article class="module">
            <CivContainer>
                <CivMain>
                    <span class="module-top-part">
                        <span class="button-row"></span>
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
