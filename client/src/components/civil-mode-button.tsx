import { type ComponentChildren } from "preact";

import { CivilMode } from "../enums";

import CivilButton from "./civil-button";
import {
    svgBlank,
    svgBookmark,
    svgEdit,
    svgFlashCard,
    svgLinkAlt,
    svgUpperInsert,
} from "./svg-icons";

export default function CivilModeButton({
    onClick,
    mode,
    children,
}: {
    onClick?: () => void;
    mode: CivilMode;
    children: ComponentChildren;
}) {
    let modeWord = getModeWord(mode);

    return (
        <CivilButton
            extraClasses={`inline-${modeWord}-button-extras margin-left-1rem`}
            onClick={onClick}
        >
            {getModeSvg(mode)}
            <span class="inline-button-extras-text ui-bold">{children}</span>
        </CivilButton>
    );
}

function getModeWord(mode: CivilMode): string {
    switch (mode) {
        case CivilMode.View:
            return "view";
        case CivilMode.Edit:
            return "edit";
        case CivilMode.Refs:
            return "ref";
        case CivilMode.Memorise:
            return "memorise";
        case CivilMode.UpperInsert:
            return "upper-insert";
        case CivilMode.BookmarkLinks:
            return "bookmark";
    }
}

function getModeSvg(mode: CivilMode) {
    switch (mode) {
        case CivilMode.View:
            return svgBlank(); // not used
        case CivilMode.Edit:
            return svgEdit();
        case CivilMode.Refs:
            return svgLinkAlt();
        case CivilMode.Memorise:
            return svgFlashCard(); // not used
        case CivilMode.UpperInsert:
            return svgUpperInsert(); // not used
        case CivilMode.BookmarkLinks:
            return svgBookmark();
    }
}
