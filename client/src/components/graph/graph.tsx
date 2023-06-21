import { h, createRef } from "preact";
import { useEffect, useState } from "preact/hooks";
import { route } from "preact-router";

import {
    Edge,
    ExpandedState,
    FullGraphStruct,
    GraphCallback,
    GraphNode,
    GraphState,
    Key,
    RefKind,
} from "types";

import { getAppState, AppStateChange } from "app-state";

import Net from "utils/net";
import { deckKindToResourceString } from "utils/civil";

import { graphPhysics } from "components/graph/graph-physics";
import { CivContainer, CivMain, CivLeft } from "components/civil-layout";
import useLocalReducer from "components/use-local-reducer";
import useModalKeyboard from "components/use-modal-keyboard";
import { svgTickedCheckBox, svgUntickedCheckBox } from "components/svg-icons";

let gUpdateGraphCallback: GraphCallback | undefined = undefined;

type LocalState = {
    activeHyperlinks: boolean;
    mouseButtonDown: boolean;
    mouseDragging: boolean;
    simIsRunning: boolean;
    haveGraphState: boolean;
    requireLoad: boolean;
};

function initialLocalState(): LocalState {
    return {
        activeHyperlinks: false, // hack: remove eventually
        mouseButtonDown: false,
        mouseDragging: false,
        simIsRunning: false,
        haveGraphState: false,
        requireLoad: false,
    };
}

enum ActionType {
    ToggleHyperlinks,
    MouseButtonDown,
    MouseButtonUp,
    MouseDraggingStart,
    MouseDraggingStop,
    SimIsRunning,
    RequireLoad,
}

type Action = {
    type: ActionType;
    data?: any;
};

function reducer(state: LocalState, action: Action) {
    switch (action.type) {
        case ActionType.ToggleHyperlinks: {
            const newState = {
                ...state,
                activeHyperlinks: !state.activeHyperlinks,
            };
            return newState;
        }
        case ActionType.MouseButtonDown: {
            const newState = {
                ...state,
                mouseButtonDown: true,
            };
            return newState;
        }
        case ActionType.MouseButtonUp: {
            const newState = {
                ...state,
                mouseButtonDown: false,
            };
            return newState;
        }
        case ActionType.MouseDraggingStart: {
            const newState = {
                ...state,
                mouseDragging: true,
            };
            return newState;
        }
        case ActionType.MouseDraggingStop: {
            const newState = {
                ...state,
                mouseDragging: false,
            };
            return newState;
        }
        case ActionType.SimIsRunning: {
            const newState = {
                ...state,
                simIsRunning: action.data,
            };
            return newState;
        }
        case ActionType.RequireLoad: {
            const newState = {
                ...state,
                requireLoad: action.data,
            };
            return newState;
        }
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

export default function Graph({ id, depth }: { id: Key; depth: number }) {
    console.log(`todo: re-implement depth: ${depth}`);

    const appState = getAppState();

    const initialState: GraphState = {
        nodes: {},
        edges: [],
    };
    const [graphState, setGraphState] = useState(initialState);
    const svgContainerRef = createRef();
    const [local, localDispatch] = useLocalReducer(
        reducer,
        initialLocalState()
    );

    const canReadKeyboard = useModalKeyboard(id, (key: string) => {
        switch (key) {
            case "h":
                localDispatch(ActionType.ToggleHyperlinks);
                break;
            case "p":
                console.log("pressed p");
                break;
            case "r":
                console.log("pressed r");
                break;
        }
    });
    function showKeyboardHelp() {
        let kl = "modal-keyboard-help";
        if (canReadKeyboard) {
            kl += " modal-keyboard-help-visible";
        }
        return (
            <div class={kl}>
                <pre>h: toggle hyperlinks</pre>
                <pre>p: previous quote</pre>
                <pre>r: random quote</pre>
            </div>
        );
    }

    function initialise() {
        let newState: GraphState = {
            nodes: {},
            edges: [],
        };

        if (
            appState.graph.value &&
            appState.graph.value.decks &&
            appState.graph.value.deckIndexFromId
        ) {
            newState.nodes[id] = {
                id: id,
                isImportant: true,
                expandedState: ExpandedState.Fully,
                deckKind:
                    appState.graph.value.decks[
                        appState.graph.value.deckIndexFromId[id]
                    ].deckKind,
                label: appState.graph.value.decks[
                    appState.graph.value.deckIndexFromId[id]
                ].name,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
            };
            regenGraphState(newState);
        }
    }

    if (appState.graph.value.fullyLoaded && local.requireLoad === true) {
        // console.log("initialising graph after loading in graph data");
        initialise();
        localDispatch(ActionType.RequireLoad, false);
    }

    useEffect(() => {
        if (appState.graph.value.fullyLoaded) {
            // console.log("initialising graph with pre-loaded graph data");
            initialise();
        } else {
            // fetch the graph data from the server,
            // dispatch the updated state,
            // and then on the next render initialise using the if statement above
            Net.get<FullGraphStruct>("/api/graph").then((graph) => {
                AppStateChange.loadGraph(graph);
                localDispatch(ActionType.RequireLoad, true);
            });
        }
    }, []);

    useEffect(() => {
        let svg = buildSvg(svgContainerRef.current, graphState);

        gUpdateGraphCallback = buildUpdateGraphCallback(svg);
        graphPhysics(graphState, gUpdateGraphCallback, function (b: boolean) {
            localDispatch(ActionType.SimIsRunning, b);
        });
    }, [graphState]);

    function regenGraphState(gs: GraphState) {
        let nodes: { [index: number]: GraphNode } = {};
        let edges: Array<Edge> = [];

        // create an updated copy of all the visible nodes

        // copy over the expanded or important nodes
        for (const key in gs.nodes) {
            if (
                gs.nodes[key].isImportant ||
                gs.nodes[key].expandedState !== ExpandedState.None
            ) {
                nodes[key] = gs.nodes[key];
            }
        }

        // copy over any nodes directly connected to the expanded or important nodes
        for (const key in nodes) {
            if (!appState.graph.value.links[key]) {
                continue;
            }

            if (nodes[key].expandedState === ExpandedState.Fully) {
                for (const link of appState.graph.value.links[key]) {
                    let [childId, _kind, _strength] = link; // negative strength == backlink

                    if (!nodes[childId]) {
                        if (gs.nodes[childId]) {
                            // copy over from previous state
                            nodes[childId] = gs.nodes[childId];
                        } else {
                            // create a new node
                            nodes[childId] = {
                                id: childId,
                                isImportant: false,
                                expandedState: ExpandedState.None,
                                deckKind:
                                    appState.graph!.value.decks![
                                        appState.graph.value.deckIndexFromId![
                                            childId
                                        ]
                                    ].deckKind,
                                label: appState.graph!.value.decks![
                                    appState.graph.value.deckIndexFromId![
                                        childId
                                    ]
                                ].name,
                                x: nodes[key].x,
                                y: nodes[key].y,
                                vx: -nodes[key].vx,
                                vy: -nodes[key].vy,
                            };
                        }
                    }
                }
            } else if (nodes[key].expandedState === ExpandedState.Partial) {
                for (const link of appState.graph.value.links[key]) {
                    let [childId, _kind, _strength] = link; // negative strength == backlink

                    if (!nodes[childId]) {
                        if (
                            gs.nodes[childId] &&
                            gs.nodes[childId].expandedState !==
                                ExpandedState.None
                        ) {
                            // copy over from previous state
                            nodes[childId] = gs.nodes[childId];
                        }
                    }
                }
            }
        }

        // update links
        for (const key in nodes) {
            if (!appState.graph.value.links[key]) {
                continue;
            }

            if (nodes[key].expandedState === ExpandedState.Fully) {
                for (const link of appState.graph.value.links[key]) {
                    let [childId, kind, strength] = link; // negative strength == backlink
                    if (nodes[childId]) {
                        // only if both sides of the link are being displayed
                        edges.push([
                            parseInt(key, 10),
                            childId,
                            strength,
                            kind,
                        ]);
                    }
                }
            } else if (nodes[key].expandedState === ExpandedState.Partial) {
                for (const link of appState.graph.value.links[key]) {
                    let [childId, kind, strength] = link; // negative strength == backlink
                    if (
                        nodes[childId] &&
                        nodes[childId].expandedState !== ExpandedState.None
                    ) {
                        // only if both sides of the link are being displayed
                        edges.push([
                            parseInt(key, 10),
                            childId,
                            strength,
                            kind,
                        ]);
                    }
                }
            }
        }

        // remove edges that would be duplicates (edges that are duplicates of
        // existing edges but have their  source/target swapped and a negated strength)
        //
        let edgesToRender: Array<Edge> = [];
        edges.forEach((e: Edge) => {
            let [srcIdx, targetIdx, strength, _kind] = e;

            // let sourceNode = nodes[srcIdx];
            // let targetNode = nodes[targetIdx];

            if (strength < 0) {
                // only render negative strengths if there is no positive complement
                //
                if (
                    !edges.some(
                        (f) => f[0] === targetIdx && f[1] === srcIdx && f[2] > 0
                    )
                ) {
                    edgesToRender.push(e);
                } else {
                    // this edge should be ignored
                }
            } else {
                edgesToRender.push(e);
            }
        });

        let updatedGraphState = {
            ...gs,
            nodes,
            edges: edgesToRender,
        };

        setGraphState(updatedGraphState);
    }

    function onMouseButtonDown(event: Event) {
        if (event.target instanceof Node) {
            const target = event.target;
            if (target.parentElement) {
                let g: HTMLElement = target.parentElement;
                if (g.nodeName === "g") {
                    svgContainerRef.current.elementClickedOn = g;
                    localDispatch(ActionType.MouseButtonDown);
                }

                if (!local.simIsRunning && gUpdateGraphCallback) {
                    // restart the simulation if it's stopped and the user starts dragging a node
                    // graphPhysics(graphState, gUpdateGraphCallback, setSimIsRunning);
                    graphPhysics(
                        graphState,
                        gUpdateGraphCallback,
                        function (b) {
                            localDispatch(ActionType.SimIsRunning, b);
                        }
                    );

                    localDispatch(ActionType.SimIsRunning, true);
                }
            }
        }
    }

    function numOpenedConnections(id: Key, gs: GraphState) {
        /*
          add nodes to a set rather than count them in place
          nodes A and B could be connected together twice (parent->child + child->parent) but this should only count as a single connection
        */

        let s = new Set();

        gs.edges.forEach((e) => {
            if (e[0] === id) {
                if (gs.nodes[e[1]].expandedState !== ExpandedState.None) {
                    s.add(e[1]);
                }
            }
            if (e[1] === id) {
                if (gs.nodes[e[0]].expandedState !== ExpandedState.None) {
                    s.add(e[0]);
                }
            }
        });

        return s.size;
    }

    function onMouseButtonUp() {
        if (local.mouseButtonDown) {
            if (local.mouseDragging) {
                const g = svgContainerRef.current.elementClickedOn;
                g.associatedNode.fx = null;
                g.associatedNode.fy = null;
                svgContainerRef.current.elementClickedOn = undefined;
                localDispatch(ActionType.MouseDraggingStop);
            } else {
                let svgNode = svgContainerRef.current.elementClickedOn;

                let id = parseInt(svgNode.getAttribute("referencing_id"), 10);
                if (id) {
                    if (
                        graphState.nodes[id].expandedState ===
                        ExpandedState.Fully
                    ) {
                        let openedNeighbours = numOpenedConnections(
                            id,
                            graphState
                        );
                        if (openedNeighbours > 1) {
                            graphState.nodes[id].expandedState =
                                ExpandedState.Partial;
                        } else {
                            graphState.nodes[id].expandedState =
                                ExpandedState.None;
                        }
                    } else if (
                        graphState.nodes[id].expandedState ===
                        ExpandedState.Partial
                    ) {
                        graphState.nodes[id].expandedState =
                            ExpandedState.Fully;
                    } else if (
                        graphState.nodes[id].expandedState ===
                        ExpandedState.None
                    ) {
                        graphState.nodes[id].expandedState =
                            ExpandedState.Fully;
                    }

                    regenGraphState(graphState);
                }
            }
            localDispatch(ActionType.MouseButtonUp);
        }
    }

    function onMouseMove(event: MouseEvent) {
        if (local.mouseButtonDown) {
            localDispatch(ActionType.MouseDraggingStart);

            const g = svgContainerRef.current.elementClickedOn;

            // identify this node's corressponding entry in graphstate and set it's fx,fy values
            const [ansx, ansy] = mouseInSvg(
                event.pageX,
                event.pageY,
                svgContainerRef.current
            );

            g.associatedNode.fx = ansx;
            g.associatedNode.fy = ansy;
        } else {
            return;
        }
    }

    function onGraphClicked(event: Event) {
        console.log("aaaa");
        console.log(event.target);
        if (event.target instanceof SVGTextElement) {
            const target = event.target;
            console.log("clicked on text element");
            if (local.activeHyperlinks) {
                console.log("active hyperlinks");
                console.log(target.id);
                if (target.id.length > 0 && target.id[0] === "/") {
                    console.log("just before route");

                    // the id looks like a url, that's good enough for us, lets go there
                    route(target.id);
                }
            }
        }
    }

    function onActivHyperlinksClicked(e: Event) {
        e.preventDefault();
        localDispatch(ActionType.ToggleHyperlinks);
    }

    return (
        <CivContainer>
            <CivLeft>
                <div
                    class="left-margin-entry fadeable clickable"
                    onClick={onActivHyperlinksClicked}
                >
                    <span class="left-margin-icon-label">
                        Active Hyperlinks
                    </span>
                    {local.activeHyperlinks
                        ? svgTickedCheckBox()
                        : svgUntickedCheckBox()}
                </div>
            </CivLeft>
            <CivMain>
                <div
                    class="svg-container"
                    ref={svgContainerRef}
                    onClick={onGraphClicked}
                    onMouseDown={onMouseButtonDown}
                    onMouseUp={onMouseButtonUp}
                    onMouseMove={onMouseMove}
                />
            </CivMain>
            {showKeyboardHelp()}
        </CivContainer>
    );
}

function mouseInSvg(mouseX: number, mouseY: number, svgContainer?: any) {
    const svgElement: SVGViewElement = svgContainer!.firstChild;
    if (svgElement) {
        const innerViewport = svgElement.viewBox.baseVal;

        const relToSvgElementX = mouseX - svgContainer.offsetLeft;
        const relToSvgElementY = mouseY - svgContainer.offsetTop;

        const outerViewportWidth = svgElement.clientWidth;
        const outerViewportHeight = svgElement.clientHeight;

        const tx = relToSvgElementX / outerViewportWidth;
        let ansx = innerViewport.width * tx;
        ansx += innerViewport.x;

        const ty = relToSvgElementY / outerViewportHeight;
        let ansy = innerViewport.height * ty;
        ansy += innerViewport.y;

        return [ansx, ansy];
    } else {
        return [0, 0];
    }
}

function buildSvg(ref: any, graphState: GraphState) {
    let svg: any = {
        container: undefined,
        element: undefined,
        edges: undefined,
        nodes: undefined,
        debug: undefined,
    };

    svg.container = ref;

    while (svg.container.firstChild) {
        svg.container.firstChild.remove();
    }

    if (Object.keys(graphState).length === 0) {
        // graphState is the empty object
        return svg;
    }

    let element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    element.setAttribute("viewBox", "-300, -300, 900, 900");

    svg.element = element;
    svg.container.appendChild(svg.element);

    // defs for marker ends
    //
    let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    let marker = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "marker"
    );
    marker.setAttribute("id", "arrow-head");
    marker.setAttribute("viewBox", "0 -5 10 10");
    marker.setAttribute("refX", "15");
    marker.setAttribute("refY", "-0.5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto");

    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "var(--graph-edge)");
    path.setAttribute("d", "M0,-5L10,0L0,5");

    marker.appendChild(path);
    defs.appendChild(marker);
    element.appendChild(defs);

    // g of edges
    //
    svg.edges = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.edges.setAttribute("fill", "none");

    // build the edges
    let nodes = graphState.nodes;

    graphState.edges.forEach((e) => {
        let [srcIdx, targetIdx, strength, kind] = e;

        let sourceNode = nodes[srcIdx];
        let targetNode = nodes[targetIdx];

        svg.edges.appendChild(
            createSvgEdge(sourceNode, targetNode, Math.abs(strength), kind)
        );
    });

    element.appendChild(svg.edges);

    // g of nodes
    //
    svg.nodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.nodes.setAttribute("fill", "var(--graph-edge)");
    svg.nodes.setAttribute("stroke-linecap", "round");
    svg.nodes.setAttribute("stroke-linejoin", "round");

    element.appendChild(svg.nodes);

    for (const key in graphState.nodes) {
        let n = graphState.nodes[key];

        let [g, textNode] = createSvgNode(n);

        svg.nodes.appendChild(g);

        let textBoundingBox = textNode.getBBox();
        n.textWidth = textBoundingBox.width;
        n.textHeight = textBoundingBox.height;
    }

    return svg;
}

function buildUpdateGraphCallback(svg?: any): GraphCallback {
    function updateGraphCallback(
        graphState: GraphState,
        physicsId: number,
        globalPhysicsId: number
    ) {
        if (physicsId !== globalPhysicsId) {
            console.log("what the fuck? this should never happen");
        }

        let edges = graphState.edges;
        let nodes = graphState.nodes;

        Array.from(svg.edges.children).forEach((svgEdge, i) => {
            if (edges.length > i) {
                let source = nodes[edges[i][0]];
                let target = nodes[edges[i][1]];
                let kind = edges[i][3];

                if (kind === RefKind.RefToParent) {
                    translateEdge(svgEdge, target, source);
                } else {
                    translateEdge(svgEdge, source, target);
                }
            }
        });

        Array.from(svg.nodes.children).forEach((svgNode?: any) => {
            let id = parseInt(svgNode.getAttribute("referencing_id"), 10);
            if (nodes[id]) {
                translateNode(svgNode, nodes[id].x, nodes[id].y);
            }
        });

        // let dbg = svg.debug.children[0];
        // dbg.textContent = `${graphState.simStats.tickCount} ${graphState.simStats.maxVelocities[0]} ${graphState.simStats.maxVelocities[1]}`;
        // dbg.setAttribute("x", xmin + 20);
        // dbg.setAttribute("y", ymin + 20);
    }

    return updateGraphCallback;
}

function createSvgEdge(
    sourceNode: GraphNode,
    targetNode: GraphNode,
    strength: number,
    kind: RefKind
) {
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    let width = 1.0 + strength * 0.5;
    path.setAttribute("stroke-width", `${width}`);

    switch (kind) {
        case RefKind.Ref:
            path.setAttribute("stroke", "var(--graph-edge)");
            translateEdge(path, sourceNode, targetNode);
            break;
        case RefKind.RefToParent:
            path.setAttribute("stroke", "var(--graph-edge)");
            path.setAttribute(
                "marker-end",
                `url(${window.location}#arrow-head)`
            );
            translateEdge(path, targetNode, sourceNode);
            break;
        case RefKind.RefToChild:
            path.setAttribute("stroke", "var(--graph-edge)");
            path.setAttribute(
                "marker-end",
                `url(${window.location}#arrow-head)`
            );
            translateEdge(path, sourceNode, targetNode);
            break;
        case RefKind.RefInContrast:
            path.setAttribute("stroke", "var(--graph-edge-in-contrast)");
            translateEdge(path, sourceNode, targetNode);
            break;
        case RefKind.RefCritical:
            path.setAttribute("stroke", "var(--graph-edge-critical)");
            translateEdge(path, sourceNode, targetNode);
            break;
    }

    return path;
}

function createSvgNode(n: GraphNode) {
    let g: any = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.associatedNode = n;

    g.setAttribute("referencing_id", n.id);

    translateNode(g, 0.0, 0.0);

    const label = n.label;
    /*
      let debugbox = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
      debugbox.setAttribute("fill", "#ffaaff");
      debugbox.setAttribute("x", "10");
      debugbox.setAttribute("y", "0");
      debugbox.setAttribute("width", "" + 10);
      debugbox.setAttribute("height", "" + 10);
      g.appendChild(debugbox);
    */
    let text1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text1.setAttribute("fill", "none");
    text1.setAttribute("x", "10");
    text1.setAttribute("y", "0");
    text1.setAttribute("stroke", "var(--bg)");
    text1.setAttribute("stroke-width", "3");
    text1.textContent = label;
    text1.classList.add("unselectable-text");
    g.appendChild(text1);

    if (n.isImportant) {
        let circledges = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );
        circledges.setAttribute("fill", "var(--graph-edge)");
        circledges.setAttribute("r", "8");
        g.appendChild(circledges);

        circledges = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );
        circledges.setAttribute("fill", "var(--bg)");
        circledges.setAttribute("r", "6");
        g.appendChild(circledges);
    }

    let circle;
    switch (n.expandedState) {
        case ExpandedState.Fully:
            circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );
            circle.setAttribute("fill", "var(--graph-node-expanded)");
            circle.setAttribute("r", "4");
            g.appendChild(circle);
            break;
        case ExpandedState.Partial:
            circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );
            circle.setAttribute("fill", "var(--graph-node-partial)");
            circle.setAttribute("r", "4");
            g.appendChild(circle);
            break;
        case ExpandedState.None:
            circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );
            circle.setAttribute("fill", "var(--graph-node-minimised)");
            circle.setAttribute("r", "4");
            g.appendChild(circle);
            break;
    }

    let text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text2.setAttribute("fill", "var(--fg-" + n.deckKind + ")");
    text2.setAttribute("x", "10");
    text2.setAttribute("y", "0");
    text2.textContent = label;
    text2.id = `/${deckKindToResourceString(n.deckKind)}/${n.id}`;
    text2.classList.add("svg-pseudo-link");
    text2.classList.add("unselectable-text"); // don't highlight the text as it's being dragged
    g.appendChild(text2);

    return [g, text2];
}

function translateEdge(svgNode: any, source: GraphNode, target: GraphNode) {
    const r = Math.hypot(target.x - source.x, target.y - source.y);
    let d = `M${source.x},${source.y} A${r},${r} 0 0,1 ${target.x},${target.y}`;
    svgNode.setAttribute("d", d);
}

function translateNode(svgNode: any, x: number, y: number) {
    svgNode.setAttribute("transform", `translate(${x},${y})`);
}
