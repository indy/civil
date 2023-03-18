import { h, ComponentChildren } from "preact";

import { FatDeck } from "types";

import LeftMarginHeading from "components/left-margin-heading";
import Title from "components/title";
import { renderInsignia } from "features/insignias/renderer";

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
                onRefsToggle={onRefsToggle}
                onFormToggle={onFormToggle}
            />
        </div>
    );
}
