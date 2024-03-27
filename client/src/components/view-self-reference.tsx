import { RenderingDeckPart } from "../enums";
import type { Reference } from "../types";

import { fontClass } from "../shared/font";
import { refKindToString, opposingKind } from "../shared/ref-kind";

type Props = {
    reference: Reference;
    extraClasses: string;
};

export default function ViewSelfReference({ reference, extraClasses }: Props) {
    const { id, refKind } = reference;

    let klass = fontClass(reference.font, RenderingDeckPart.UiInterleaved);
    klass += " " + extraClasses;

    return (
        <div class={klass} key={id}>
            <span class="arrival-ref-kind">
                {refKindToString(opposingKind(refKind))}
            </span>
        </div>
    );
}
