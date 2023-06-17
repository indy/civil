import { h } from "preact";

import { setbit, clearbit, bitset, bitAsValue } from "utils/bitops";
import { renderInsignia } from "components/insignias/renderer";

type Props = {
    insigniaId: number;
    onChange: (id: number) => void;
};

export default function InsigniaSelector({ insigniaId, onChange }: Props) {
    function onTicked(bit: number) {
        let val = setbit(insigniaId, bit);
        onChange(val);
    }

    function onUnticked(bit: number) {
        let val = clearbit(insigniaId, bit);
        onChange(val);
    }

    return (
        <div class="insignia-selector">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <SingleInsignia
                    value={insigniaId}
                    bit={i}
                    onTicked={onTicked}
                    onUnticked={onUnticked}
                />
            ))}
        </div>
    );
}

type SingleInsigniaProps = {
    value: number;
    bit: number;
    onTicked: (bit: number) => void;
    onUnticked: (bit: number) => void;
};

function SingleInsignia({
    value,
    bit,
    onTicked,
    onUnticked,
}: SingleInsigniaProps) {
    let cl = "insignia-button ";
    cl += bitset(value, bit) ? "insignia-selected" : "insignia-unselected";

    function onClickHandler() {
        if (bitset(value, bit)) {
            onUnticked(bit);
        } else {
            onTicked(bit);
        }
    }

    return (
        <div class={cl} onClick={onClickHandler}>
            {renderInsignia(bitAsValue(bit))}
        </div>
    );
}
