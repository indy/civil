import { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";

import { CivilMode, FatDeck, RenderingDeckPart } from "../types";

import { getAppState } from "../app-state";

import { addToolbarSelectableClasses } from "../shared/css";
import { fontClass } from "../shared/font";

import { CivContainer, CivLeft } from "./civil-layout";
import { renderInsignia } from "./insignia-renderer";
import LeftMarginHeading from "./left-margin-heading";
import Title from "./title";
import useMouseHovering from "./use-mouse-hovering";

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
