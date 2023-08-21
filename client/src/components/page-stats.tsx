import { h } from "preact";

import TopBarMenu from "components/top-bar-menu";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

export default function Stats({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <StatsModule />
        </div>
    );
}

function StatsModule() {
    return (
        <article class="c-stats-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Stats</h3>
                </CivLeft>
                <CivMain>Placeholder</CivMain>
            </CivContainer>
        </article>
    );
}
