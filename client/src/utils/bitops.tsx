export function bitAsValue(bit: number) {
    return 1 << (bit - 1);
}

export function bitset(value: number, bit: number) {
    return !!(value & (1 << (bit - 1)));
}

export function setbit(value: number, bit: number) {
    return value | (1 << (bit - 1));
}

export function clearbit(value: number, bit: number) {
    return value & ~(1 << (bit - 1));
}
