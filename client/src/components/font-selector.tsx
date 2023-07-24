import { h } from "preact";

import { Font } from "types";

export default function FontSelector({
    font,
    onChangedFont,
}: {
    font: Font;
    onChangedFont: (font: Font) => void;
}) {
    function stringToFont(s: string): Font {
        if (s === "serif") return Font.Serif;
        if (s === "sans") return Font.Sans;
        if (s === "cursive") return Font.Cursive;
        if (s === "ai") return Font.AI;
        if (s === "magazine") return Font.Magazine;
        if (s === "book") return Font.Book;
        if (s === "old-book") return Font.OldBook;

        return Font.Serif;
    }

    function onChange(e: Event) {
        // todo: can the Font value be passed n as e.target.value?
        if (e.target instanceof HTMLSelectElement) {
            const font = stringToFont(e.target.value);
            onChangedFont(font);
        }
    }

    let t = font;
    return (
        <span class="ui">
            <select onChange={onChange}>
                <option value="serif" selected={t === Font.Serif}>
                    Serif
                </option>
                <option value="cursive" selected={t === Font.Cursive}>
                    Cursive
                </option>
                <option value="ai" selected={t === Font.AI}>
                    AI
                </option>
                <option value="book" selected={t === Font.Book}>
                    Book
                </option>
                <option value="old-book" selected={t === Font.OldBook}>
                    Old Book
                </option>
                <option value="magazine" selected={t === Font.Magazine}>
                    Magazine
                </option>
                <option value="sans" selected={t === Font.Sans}>
                    Sans
                </option>
            </select>
        </span>
    );
}
