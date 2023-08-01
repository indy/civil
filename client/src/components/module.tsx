import { h, ComponentChildren } from "preact";

import { CivContainer, CivMain } from "components/civil-layout";

type Props = {
    heading: string;
    buttons?: ComponentChildren;
    children: ComponentChildren;
};

export default function Module({ heading, children, buttons }: Props) {
    return (
        <article class="module">
            <CivContainer>
                <CivMain>
                    <span class="module-top-part">
                        <span class="button-row">{buttons}</span>
                        <h1 class="ui">{heading}</h1>
                    </span>
                    {children}
                </CivMain>
            </CivContainer>
        </article>
    );
}
