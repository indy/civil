import { h, ComponentChildren } from "preact";

import { renderInsignia } from "./Insignias";
import LeftMarginHeading from "./LeftMarginHeading";
import Title from "./Title";

export default function TopMatter({
    title,
    deck,
    isShowingUpdateForm,
    isEditingDeckRefs,
    onRefsToggle,
    onFormToggle,
    children,
}: {
    title?: any;
    deck?: any;
    isShowingUpdateForm?: any;
    isEditingDeckRefs?: any;
    onRefsToggle?: any;
    onFormToggle?: any;
    children?: ComponentChildren;
}) {
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
