import { h, ComponentChildren } from "preact";

import { FatDeck } from "../types";

import LeftMarginHeading from "./LeftMarginHeading";
import Title from "./Title";
import { renderInsignia } from "./Insignias";

type Props = {
    title: string;
    deck: FatDeck;
    isShowingUpdateForm: boolean;
    isEditingDeckRefs: boolean;
    onRefsToggle: () => void;
    onFormToggle: () => void;
    children?: ComponentChildren;
};

export default function TopMatter({
    title,
    deck,
    isShowingUpdateForm,
    isEditingDeckRefs,
    onRefsToggle,
    onFormToggle,
    children,
}: Props) {
    if (!deck) {
        return <div></div>;
    }

    return (
        <div>
            <div class="left-margin">
                <LeftMarginHeading>
                    {renderInsignia(deck.insignia)}
                </LeftMarginHeading>
                {children}
            </div>
            <Title
                title={title}
                isShowingUpdateForm={isShowingUpdateForm}
                isEditingDeckRefs={isEditingDeckRefs}
                onRefsToggle={onRefsToggle}
                onFormToggle={onFormToggle}
            />
        </div>
    );
}
