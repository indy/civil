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
            {bitset(insigniaId, 7) && svgBox()}
            {bitset(insigniaId, 8) && svgTag("#00aa00")}
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
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#000000"
            viewBox="1 0 16 16"
        >
            <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z" />
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
            viewBox="1 0 16 16"
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
            viewBox="1 0 16 16"
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

function svgBox() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill="#964B00"
            viewBox="1 0 16 16"
        >
            <path
                fill-rule="evenodd"
                d="M15.528 2.973a.75.75 0 0 1 .472.696v8.662a.75.75 0 0 1-.472.696l-7.25 2.9a.75.75 0 0 1-.557 0l-7.25-2.9A.75.75 0 0 1 0 12.331V3.669a.75.75 0 0 1 .471-.696L7.443.184l.01-.003.268-.108a.75.75 0 0 1 .558 0l.269.108.01.003 6.97 2.789ZM10.404 2 4.25 4.461 1.846 3.5 1 3.839v.4l6.5 2.6v7.922l.5.2.5-.2V6.84l6.5-2.6v-.4l-.846-.339L8 5.961 5.596 5l6.154-2.461L10.404 2Z"
            />
        </svg>
    );
}

/*
function svgScratchList(hexColour: string) {
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

function svgTag(hexColour: string) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="16"
            fill={hexColour}
            viewBox="1 0 16 16"
        >
            <path d="M2 1a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l4.586-4.586a1 1 0 0 0 0-1.414l-7-7A1 1 0 0 0 6.586 1H2zm4 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
        </svg>
    );
}

export function svgScratchListLink(hexColour: string) {
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
