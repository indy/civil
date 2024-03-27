import { RefKind, RenderingDeckPart } from "../enums";
import type { Reference } from "../types";

import { fontClass } from "../shared/font";

type Props = {
    reference: Reference;
    extraClasses: string;
};

function opposingRefKindToString(refKind: RefKind): string {
    switch (refKind) {
        case RefKind.Ref:
            return "Ref";
        case RefKind.RefToParent:
            return "Child";
        case RefKind.RefToChild:
            return "Parent";
        case RefKind.RefInContrast:
            return "Contrast";
        case RefKind.RefCritical:
            return "Critical";
    }
}

export default function ViewSelfReference({ reference, extraClasses }: Props) {
    const { id, refKind } = reference;

    let klass = fontClass(reference.font, RenderingDeckPart.UiInterleaved);
    klass += " " + extraClasses;

    return (
        <div class={klass} key={id}>
            <span class="arrival-ref-kind">
                {opposingRefKindToString(refKind)}
            </span>
        </div>
    );
}
