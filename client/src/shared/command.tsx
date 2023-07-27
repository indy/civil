export function isCommand(text: string) {
    return text.length >= 1 && text[0] === ":";
}

export function indexToShortcut(index: number) {
    if (index < 9) {
        return String.fromCharCode(index + 49);
    } else {
        return String.fromCharCode(index - 9 + 65).toLowerCase();
    }
}
