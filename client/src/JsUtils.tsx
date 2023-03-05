import { RefKind } from "./types";

// remove the keys from obj that have empty strings
export function removeEmptyStrings(obj, keys: Array<string>) {
    for (var i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (typeof obj[key] === "string" && obj[key].trim().length === 0) {
            delete obj[key];
        }
    }
    return obj;
}

export function nonEmptyArray<T>(arr: Array<T>) {
    return arr && arr.length > 0;
}

export function capitalise(text: string) {
    const capitaliseWord = (word) =>
        word.slice(0, 1).toUpperCase() + word.slice(1);
    return text.split(" ").map(capitaliseWord).join(" ");
}

export function plural(num: number, phrase: string, suffix: string): string {
    return num === 1 ? `${num} ${phrase}` : `${num} ${phrase}${suffix}`;
}

export function formattedDate(timestamp: string) {
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
    };
    const d = new Date(timestamp);
    const textual = d.toLocaleDateString("en-GB", options);

    return textual;
}

export function formattedTime(timestamp: string) {
    const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
    };
    const d = new Date(timestamp);
    const textual = d.toLocaleTimeString("en-GB", options);

    return textual;
}

export function daysUntil(date: string) {
    let nextTestDate = new Date(date);
    let todayDate = new Date();

    let delta = nextTestDate.getTime() - todayDate.getTime();
    let deltaDays = delta / (1000 * 3600 * 24);

    return Math.round(deltaDays);
}

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
