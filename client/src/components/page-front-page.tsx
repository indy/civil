import { h } from "preact";
import { Link } from "preact-router";

import { AppStateChange, getAppState, immutableState } from "app-state";

import { capitalise } from "shared/english";

import InsigniaGrouping from "components/insignia-grouping";
import { LazyLoadedGrouping } from "components/groupings";
import { CivContainer, CivMain } from "components/civil-layout";

import Paginator from "components/paginator";

export default function FrontPage({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <Paginator />
            <FilterModule />
        </div>
    );
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
