import { h, ComponentChildren } from "preact";

import { FatDeck } from "types";

import LeftMarginHeading from "./left-margin-heading";
import Title from "./title";
import { renderInsignia } from "./insignias";

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
