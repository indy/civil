import { Font } from "../enums";

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
        <span class="c-font-selector ui">
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
                <option
                    value={Font.FrenchCanon}
                    selected={font === Font.FrenchCanon}
                >
                    French Canon
                </option>
                <option value={Font.English} selected={font === Font.English}>
                    English
                </option>
                <option
                    value={Font.DeWalpergens}
                    selected={font === Font.DeWalpergens}
                >
                    De Walpergens
                </option>
                <option
                    value={Font.DoublePica}
                    selected={font === Font.DoublePica}
                >
                    Double Pica
                </option>
                <option
                    value={Font.GreatPrimer}
                    selected={font === Font.GreatPrimer}
                >
                    Great Primer
                </option>
                <option
                    value={Font.ThreeLinesPica}
                    selected={font === Font.ThreeLinesPica}
                >
                    Three Lines Pica
                </option>
                <option
                    value={Font.LibreBaskerville}
                    selected={font === Font.LibreBaskerville}
                >
                    Libre Baskerville
                </option>
            </select>
        </span>
    );
}
