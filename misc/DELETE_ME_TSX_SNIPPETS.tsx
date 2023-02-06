import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

import { Link } from "preact-router";

import { Link, Router, route, RouterOnChangeArgs } from "preact-router";



import Net from "./Net.js";

import { getAppState, AppStateChange } from '../AppState';





    const handleChangeEvent = (event: Event) => {
        if (event.target instanceof HTMLInputElement) {
            const target = event.target;
            const name = target.name;
            const value = target.value;

            ...
        }
    }

// todo: fix any code with 'as any'





import { h, ComponentChildren } from "preact";
export default function WhenVerbose({children}: {children: ComponentChildren}) {
}
