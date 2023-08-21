import { h } from "preact";

import TopBarMenu from "components/top-bar-menu";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";

export default function Seek({ path }: { path?: string }) {
    return (
        <div>
            <TopBarMenu />
            <SeekModule />
        </div>
    );
}

function SeekModule() {
    return (
        <article class="c-seek-module module margin-top-9">
            <CivContainer>
                <CivLeft>
                    <h3 class="ui hack-margin-top-minus-half">Seek</h3>
                </CivLeft>
                <CivMain>Placeholder</CivMain>
            </CivContainer>
        </article>
    );
}
