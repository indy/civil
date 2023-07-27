import { h } from "preact";
import { bitset } from "utils/bitops";

export function renderInsignia(insigniaId: number) {
    return (
        <span>
            {bitset(insigniaId, 1) && svgTwitter()}
            {bitset(insigniaId, 2) && svgBook()}
            {bitset(insigniaId, 3) && svgCone()}
            {bitset(insigniaId, 4) && svgLightning()}
            {bitset(insigniaId, 5) && svgHeart()}
            {bitset(insigniaId, 6) && svgFire()}
            {bitset(insigniaId, 7) && svgCollection()}
            {bitset(insigniaId, 8) && svgReRead("#00aa00")}
            {bitset(insigniaId, 9) && svgPencil()}
        </span>
    );
}

// https://icons.getbootstrap.com/icons/twitter/
// 1DA1F2 == twitter blue
function svgTwitter() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#1DA1F2"
            viewBox="1 0 16 16"
        >
            <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
        </svg>
    );
}

function svgBook() {
    // note: original svgBook path was translated along y by 2 using https://yqnn.github.io/svg-path-editor/
    //
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="var(--fg)"
            viewBox="1 0 16 16"
        >
            <path d="M 1 4.828 c 0.885 -0.37 2.154 -0.769 3.388 -0.893 c 1.33 -0.134 2.458 0.063 3.112 0.752 v 9.746 c -0.935 -0.53 -2.12 -0.603 -3.213 -0.493 c -1.18 0.12 -2.37 0.461 -3.287 0.811 V 4.828 z m 7.5 -0.141 c 0.654 -0.689 1.782 -0.886 3.112 -0.752 c 1.234 0.124 2.503 0.523 3.388 0.893 v 9.923 c -0.918 -0.35 -2.107 -0.692 -3.287 -0.81 c -1.094 -0.111 -2.278 -0.039 -3.213 0.492 V 4.687 z M 8 3.783 C 7.015 2.936 5.587 2.81 4.287 2.94 c -1.514 0.153 -3.042 0.672 -3.994 1.105 A 0.5 0.5 0 0 0 0 4.5 v 11 a 0.5 0.5 0 0 0 0.707 0.455 c 0.882 -0.4 2.303 -0.881 3.68 -1.02 c 1.409 -0.142 2.59 0.087 3.223 0.877 a 0.5 0.5 0 0 0 0.78 0 c 0.633 -0.79 1.814 -1.019 3.222 -0.877 c 1.378 0.139 2.8 0.62 3.681 1.02 A 0.5 0.5 0 0 0 16 15.5 v -11 a 0.5 0.5 0 0 0 -0.293 -0.455 c -0.952 -0.433 -2.48 -0.952 -3.994 -1.105 C 10.413 2.809 8.985 2.936 8 3.783 z" />
        </svg>
    );
}

function svgCone() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#ff7221"
            viewBox="1 -0.5 16 16"
        >
            <path d="m9.97 4.88.953 3.811C10.159 8.878 9.14 9 8 9c-1.14 0-2.158-.122-2.923-.309L6.03 4.88C6.635 4.957 7.3 5 8 5s1.365-.043 1.97-.12zm-.245-.978L8.97.88C8.718-.13 7.282-.13 7.03.88L6.275 3.9C6.8 3.965 7.382 4 8 4c.618 0 1.2-.036 1.725-.098zm4.396 8.613a.5.5 0 0 1 .037.96l-6 2a.5.5 0 0 1-.316 0l-6-2a.5.5 0 0 1 .037-.96l2.391-.598.565-2.257c.862.212 1.964.339 3.165.339s2.303-.127 3.165-.339l.565 2.257 2.391.598z" />
        </svg>
    );
}

function svgLightning() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#e6aa00"
            viewBox="1 0 16 16"
        >
            <path d="M5.52.359A.5.5 0 0 1 6 0h4a.5.5 0 0 1 .474.658L8.694 6H12.5a.5.5 0 0 1 .395.807l-7 9a.5.5 0 0 1-.873-.454L6.823 9.5H3.5a.5.5 0 0 1-.48-.641l2.5-8.5z" />
        </svg>
    );
}

function svgHeart() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#ff0000"
            viewBox="1 -1 16 16"
        >
            <path
                fill-rule="evenodd"
                d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"
            />
        </svg>
    );
}

function svgFire() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#ff0000"
            viewBox="1 0 16 16"
        >
            <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z" />
        </svg>
    );
}

function svgCollection() {
    // https://icons.getbootstrap.com/icons/diagram-3-fill/
    // but with the width, fill and viewBox modified
    //
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#964B00"
            viewBox="1 -1 16 16"
        >
            <path
                fill-rule="evenodd"
                d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 2 7h5.5V6A1.5 1.5 0 0 1 6 4.5v-1zm-6 8A1.5 1.5 0 0 1 1.5 10h1A1.5 1.5 0 0 1 4 11.5v1A1.5 1.5 0 0 1 2.5 14h-1A1.5 1.5 0 0 1 0 12.5v-1zm6 0A1.5 1.5 0 0 1 7.5 10h1a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5v-1zm6 0a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-1z"
            />
        </svg>
    );
}

/*
function svgBookmark(hexColour: string) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill={hexColour}
            viewBox="1 0 16 16"
        >
            <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
        </svg>
    );
}
*/

function svgReRead(hexColour: string) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill={hexColour}
            viewBox="1 0 16 16"
        >
            <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192Zm3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z" />
        </svg>
    );
}

export function svgBookmarkLink(hexColour: string) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill={hexColour}
            viewBox="1 0 16 16"
        >
            <path
                fill-rule="evenodd"
                d="M2 15.5V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.74.439L8 13.069l-5.26 2.87A.5.5 0 0 1 2 15.5zm6.5-11a.5.5 0 0 0-1 0V6H6a.5.5 0 0 0 0 1h1.5v1.5a.5.5 0 0 0 1 0V7H10a.5.5 0 0 0 0-1H8.5V4.5z"
            />
        </svg>
    );
}

function svgPencil() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#5b1dbf"
            viewBox="1 0 16 16"
        >
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
        </svg>
    );
}
