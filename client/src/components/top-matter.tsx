import { h, ComponentChildren } from "preact";
import { useRef } from "preact/hooks";

import { RenderingDeckPart, FatDeck, CivilMode } from "types";

import { getAppState } from "app-state";

import { CivContainer, CivLeft } from "components/civil-layout";
import LeftMarginHeading from "components/left-margin-heading";
import Title from "components/title";
import { renderInsignia } from "components/insignia-renderer";

import useMouseHovering from "components/use-mouse-hovering";

import { addToolbarSelectableClasses } from "shared/css";
import { fontClass } from "shared/font";

type Props = {
    title: string;
    deck: FatDeck;
    isShowingUpdateForm: boolean;
    setShowingUpdateForm: (value: boolean) => void;
    isEditingDeckRefs: boolean;
    setEditingDeckRefs: (value: boolean) => void;
    children?: ComponentChildren;
};

export default function TopMatter({
    title,
    deck,
    isShowingUpdateForm,
    setShowingUpdateForm,
    isEditingDeckRefs,
    setEditingDeckRefs,
    children,
}: Props) {
    const appState = getAppState();

    const hoveringRef = useRef(null);
    const mouseHovering = useMouseHovering(hoveringRef);

    if (!deck) {
        return <div></div>;
    }

    let containerClasses = "c-top-matter ";
    containerClasses += fontClass(deck.font, RenderingDeckPart.UiInterleaved);
    if (mouseHovering) {
        let mode = appState.mode.value;
        // only show as selectable if in edit or refs mode
        if (mode === CivilMode.Edit || mode === CivilMode.Refs) {
            containerClasses += addToolbarSelectableClasses(mode);
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
                setShowingUpdateForm={setShowingUpdateForm}
                isEditingDeckRefs={isEditingDeckRefs}
                setEditingDeckRefs={setEditingDeckRefs}
            />
        </CivContainer>
    );
}
