export function sanitize(text: string): string {
    let blocked = [
        "?",
        ">",
        "<",
        "+",
        "-",
        "/",
        "*",
        "%",
        "!",
        "(",
        ")",
        ",",
        ".",
        ":",
        "`",
        "\\",
        "'",
    ];
    return blocked.reduce((a, b) => a.replaceAll(b, ""), text);
}
