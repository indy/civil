import { RefKind } from "../enums";

export function opposingKind(kind: RefKind): RefKind {
    switch (kind) {
        case RefKind.Ref:
            return RefKind.Ref;
        case RefKind.RefToParent:
            return RefKind.RefToChild;
        case RefKind.RefToChild:
            return RefKind.RefToParent;
        case RefKind.RefInContrast:
            return RefKind.RefInContrast;
        case RefKind.RefCritical:
            return RefKind.RefCritical;
    }
}

export function refKindToString(refKind: RefKind): string {
    switch (refKind) {
        case RefKind.Ref:
            return "Ref";
        case RefKind.RefToParent:
            return "Parent";
        case RefKind.RefToChild:
            return "Child";
        case RefKind.RefInContrast:
            return "InContrast";
        case RefKind.RefCritical:
            return "Critical";
    }
}

export function stringToRefKind(s: string): RefKind | undefined {
    if (s === "Ref") {
        return RefKind.Ref;
    }
    if (s === "RefToParent") {
        return RefKind.RefToParent;
    }
    if (s === "RefToChild") {
        return RefKind.RefToChild;
    }
    if (s === "RefInContrast") {
        return RefKind.RefInContrast;
    }
    if (s === "RefCritical") {
        return RefKind.RefCritical;
    }
    return undefined;
}
