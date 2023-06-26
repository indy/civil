import { h, ComponentChildren } from "preact";
import { useRef } from "preact/hooks";

import { FatDeck, ToolbarMode } from "types";

import { getAppState } from "app-state";

import { CivContainer, CivLeft } from "components/civil-layout";
import LeftMarginHeading from "components/left-margin-heading";
import Title from "components/title";
import { renderInsignia } from "components/insignia-renderer";

import useMouseHovering from "components/use-mouse-hovering";

import { addToolbarSelectableClasses } from "utils/civil";

type Props = {
    title: string;
    deck: FatDeck;
    isShowingUpdateForm: boolean;
    onRefsToggle: () => void;
    onFormToggle: () => void;
    children?: ComponentChildren;
};

export default function TopMatter({
    title,
    deck,
    isShowingUpdateForm,
    onRefsToggle,
    onFormToggle,
    children,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

    if (!deck) {
        return <div></div>;
    }

    let containerClasses = "";
    if (mouseHovering) {
        let toolbarMode = appState.toolbarMode.value;
        // only show as selectable if in edit or refs mode
        if (
            toolbarMode === ToolbarMode.Edit ||
            toolbarMode === ToolbarMode.Refs
        ) {
            containerClasses += addToolbarSelectableClasses(toolbarMode);
        }
    }

    return (
        <CivContainer extraClasses={containerClasses}>
            <CivLeft>
                <LeftMarginHeading>
                    {renderInsignia(deck.insignia)}
                    {children}
                </LeftMarginHeading>
            </CivLeft>
            <Title
                title={title}
                hoveringRef={hoveringRef}
                isShowingUpdateForm={isShowingUpdateForm}
                onRefsToggle={onRefsToggle}
                onFormToggle={onFormToggle}
            />
        </CivContainer>
    );
}
