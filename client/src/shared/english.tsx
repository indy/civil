export function capitalise(text: string) {
    const capitaliseWord = (word) =>
        word.slice(0, 1).toUpperCase() + word.slice(1);
    return text.split(" ").map(capitaliseWord).join(" ");
}

export function plural(num: number, phrase: string, suffix: string): string {
    return num === 1 ? `${num} ${phrase}` : `${num} ${phrase}${suffix}`;
}
