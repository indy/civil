import { h } from "preact";

import { getAppState } from '../AppState';


export default function WhenVerbose({children}: {children?: any}) {
    const appState = getAppState();
    return (<div>{appState.verboseUI.value && children}</div>);
}
