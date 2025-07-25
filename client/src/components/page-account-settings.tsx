import { type ComponentChildren } from "preact";
import { useState } from "preact/hooks";

import { CivilSpan, ColourScheme } from "../enums";

import { AppStateChange, getAppState } from "../app-state";

import { basicUiConfig, updateAndSaveUiConfig } from "../shared/ui-config";

import { CivContainer, CivMainUi } from "./civil-layout";
import { svgComputer, svgMoon, svgSun, svgTablet } from "./svg-icons";

export default function AccountSettings({ path }: { path?: string }) {
    const appState = getAppState();

    // <TestColourSchemeModule />
    // <TestRollupModule />

    return (
        <article>
            <ColourSchemeSelector />
            {appState.canNarrowWidth && <SpanSelector />}
            <ResetUiConfig />
        </article>
    );
}

function ResetUiConfig({}) {
    const handleResetUI = () => {
        updateAndSaveUiConfig(basicUiConfig());
    };

    return (
        <Module heading="Reset UI Config">
            <form onSubmit={handleResetUI}>
                <input class="c-civil-button" type="submit" value="Reset" />
            </form>
        </Module>
    );
}

function SpanSelector({}) {
    const appState = getAppState();

    const [span, setSpan] = useState(appState.span.value);

    function updateSpan(s: CivilSpan) {
        setSpan(s);
        AppStateChange.setSpan({ span: s });
    }

    return (
        <Module heading="span selector">
            <div class="icon-horizontal-grouping">
                <SpanOption
                    desired={CivilSpan.Narrow}
                    current={span}
                    setter={updateSpan}
                >
                    {svgTablet()}
                </SpanOption>
                <SpanOption
                    desired={CivilSpan.Broad}
                    current={span}
                    setter={updateSpan}
                >
                    {svgComputer()}
                </SpanOption>
            </div>
        </Module>
    );
}

type SpanOptionProps = {
    desired: CivilSpan;
    current: CivilSpan;
    setter: (b: CivilSpan) => void;
    children: ComponentChildren;
};

function SpanOption({ desired, current, setter, children }: SpanOptionProps) {
    function clickHandler() {
        if (current !== desired) {
            setter(desired);
        }
    }

    let cl = "icon-button ";
    cl += current === desired ? "icon-selected" : "icon-unselected";

    return (
        <div class={cl} onClick={clickHandler}>
            {children}
        </div>
    );
}

function ColourSchemeSelector({}) {
    const appState = getAppState();

    const [colourScheme, setColourScheme] = useState(
        appState.uiConfig.value.colourScheme,
    );

    function updateColourScheme(cs: ColourScheme) {
        setColourScheme(cs);
        const uiConfig = {
            ...appState.uiConfig.value,
            colourScheme: cs,
        };
        updateAndSaveUiConfig(uiConfig);
    }

    return (
        <Module heading="colour scheme">
            <div class="icon-horizontal-grouping">
                <ColourSchemeOption
                    desiredScheme={ColourScheme.Light}
                    colourScheme={colourScheme}
                    setColourScheme={updateColourScheme}
                >
                    {svgSun()}
                </ColourSchemeOption>
                <ColourSchemeOption
                    desiredScheme={ColourScheme.Dark}
                    colourScheme={colourScheme}
                    setColourScheme={updateColourScheme}
                >
                    {svgMoon()}
                </ColourSchemeOption>
            </div>
        </Module>
    );
}

type ColourSchemeOptionProps = {
    desiredScheme: ColourScheme;
    colourScheme: ColourScheme;
    setColourScheme: (cs: ColourScheme) => void;
    children: ComponentChildren;
};

function ColourSchemeOption({
    desiredScheme,
    colourScheme,
    setColourScheme,
    children,
}: ColourSchemeOptionProps) {
    function clickHandler() {
        if (colourScheme !== desiredScheme) {
            setColourScheme(desiredScheme);
        }
    }

    let cl = "icon-button ";
    cl += colourScheme === desiredScheme ? "icon-selected" : "icon-unselected";

    return (
        <div class={cl} onClick={clickHandler}>
            {children}
        </div>
    );
}

/*
function TestRollupModule({}) {
    if (true) {
        return <div></div>;
    }

    const [active, setActive] = useState(true);
    const [waitVal, setWaitVal] = useState(true);

    function onClick() {
        const waitingFor = waitVal ? WaitingFor.Server : WaitingFor.User;
        AppStateChange.setWaitingFor({ waitingFor });
        setWaitVal(!waitVal);
        setActive(!active);
    }

    const classes = active
        ? "rollupable-500ms rollupable-active"
        : "rollupable-500ms";

    return (
        <Module heading="test rollup module">
            <div onClick={onClick}>Click Me</div>
            <div class={classes}>
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Vivamus nec diam sed massa malesuada iaculis congue at erat.
                    Sed pulvinar fermentum lorem quis varius. Praesent tincidunt
                    eros ac sem volutpat, ac elementum dolor semper.
                    Pellentesque nulla est, vehicula et tempus ac, convallis et
                    metus. Pellentesque semper sem vel ligula consequat cursus.
                    Quisque vehicula est eget lorem interdum volutpat eu at
                    massa. Ut nisi tellus, condimentum eget nisl id, vulputate
                    dapibus augue. Morbi vitae nulla nisl. Pellentesque id
                    mattis eros. Phasellus at lacus est. Class aptent taciti
                    sociosqu ad litora torquent per conubia nostra, per inceptos
                    himenaeos. Etiam semper orci vitae nunc tristique imperdiet.
                    Pellentesque imperdiet arcu in vulputate tempus. In volutpat
                    non quam sed elementum. Morbi gravida tincidunt odio eget
                    finibus.
                </p>
            </div>
        </Module>
    );
}

function TestColourSchemeModule({}) {
    // if (true) {
    //     return <div></div>;
    // }
    return (
        <Module heading="test colour scheme module">
            <h2 class="clock-01">Clock 01: Timelines</h2>
            <h2 class="clock-02">Clock 02</h2>
            <h2 class="clock-03">Clock 03: Events</h2>
            <h2 class="clock-04">Clock 04</h2>

            <h2 class="clock-05">Clock 05</h2>
            <h2 class="clock-06">Clock 06: Ideas</h2>
            <h2 class="clock-07">Clock 07: Quotes</h2>
            <h2 class="clock-08">Clock 08</h2>

            <h2 class="clock-09">Clock 09: People</h2>
            <h2 class="clock-10">Clock 10</h2>
            <h2 class="clock-11">Clock 11: Dialogues</h2>
            <h2 class="clock-12">Clock 12: Articles</h2>

            <h2 class="pigment-ideas">Ideas</h2>
            <h2 class="pigment-articles">Articles</h2>
            <h2 class="pigment-people">People</h2>
            <h2 class="pigment-timelines">Timelines</h2>
            <h2 class="pigment-quotes">Quotes</h2>
            <h2 class="pigment-dialogues">Dialogues</h2>
            <h2 class="pigment-events">Events</h2>
            <h2 class="pigment-memorise">Memorise</h2>
        </Module>
    );
}
*/
type Props = {
    heading: string;
    buttons?: ComponentChildren;
    children: ComponentChildren;
};

function Module({ heading, children, buttons }: Props) {
    return (
        <article class="module">
            <CivContainer>
                <CivMainUi>
                    <span class="module-top-part">
                        <span class="display-flex-justify-right">
                            {buttons}
                        </span>
                        <h1 class="ui">{heading}</h1>
                    </span>
                    {children}
                </CivMainUi>
            </CivContainer>
        </article>
    );
}
