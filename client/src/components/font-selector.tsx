import { h } from "preact";

import { Font } from "types";

export default function FontSelector({
    font,
    onChangedFont,
}: {
    font: Font;
    onChangedFont: (font: Font) => void;
}) {
    function onChange(e: Event) {
        if (e.target instanceof HTMLSelectElement) {
            const font = parseInt(e.target.value, 10) as Font;
            onChangedFont(font);
        }
    }

    return (
        <span class="ui">
            <select onChange={onChange}>
                <option value={Font.Serif} selected={font === Font.Serif}>
                    Serif
                </option>
                <option value={Font.Sans} selected={font === Font.Sans}>
                    Sans
                </option>
                <option value={Font.Cursive} selected={font === Font.Cursive}>
                    Cursive
                </option>
                <option value={Font.AI} selected={font === Font.AI}>
                    AI
                </option>
                <option value={Font.Magazine} selected={font === Font.Magazine}>
                    Magazine
                </option>
                <option value={Font.Book} selected={font === Font.Book}>
                    Book
                </option>
                <option value={Font.OldBook} selected={font === Font.OldBook}>
                    Old Book
                </option>
            </select>
        </span>
    );
}
