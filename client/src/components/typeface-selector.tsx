import { h } from "preact";

export default function TypefaceSelector({
    typeface,
    onChangedTypeface,
}: {
    typeface: string;
    onChangedTypeface: (typeface: string) => void;
}) {
    function onChange(e: Event) {
        if (e.target instanceof HTMLSelectElement) {
            onChangedTypeface(e.target.value);
        }
    }

    let t = typeface;
    return (
        <span class="ui">
            <select onChange={onChange} name="typefaces" id="typefaces">
                <option value="serif" selected={t === "serif"}>
                    Serif
                </option>
                <option value="cursive" selected={t === "cursive"}>
                    Cursive
                </option>
                <option value="ai" selected={t === "ai"}>
                    AI
                </option>
                <option value="book" selected={t === "book"}>
                    Book
                </option>
                <option value="old-book" selected={t === "old-book"}>
                    Old Book
                </option>
                <option value="magazine" selected={t === "magazine"}>
                    Magazine
                </option>
                <option value="sans" selected={t === "sans"}>
                    Sans
                </option>
            </select>
        </span>
    );
}
