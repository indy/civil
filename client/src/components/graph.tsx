import { createRef } from "preact";
import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import { Direction, LineStyle, RefKind } from "../enums";
import type {
    Arc,
    GraphCallback,
    GraphNode,
    GraphState,
    Key,
    SlimDeck,
} from "../types";

import { deckKindToResourceString } from "../shared/deck";
import Net from "../shared/net";

import { CivContainer, CivLeft } from "./civil-layout";
import { graphPhysics } from "./graph-physics";
import AlwaysVisibleKeyboardHelp from "./always-visible-keyboard-help";
import { svgTickedCheckBox, svgUntickedCheckBox } from "./svg-icons";
import useLocalReducer from "./use-local-reducer";
import useModalKeyboard from "./use-modal-keyboard";

let gUpdateGraphCallback: GraphCallback | undefined = undefined;

type Edge = {
    fromId: Key;
    toId: Key;
    refKind: RefKind;
    direction: Direction;
};

type ConnectivityData = {
    sourceDeck: SlimDeck;
    edges: Array<Edge>;
    decks: Array<SlimDeck>;
};

type LocalState = {
    activeHyperlinks: boolean;
    mouseButtonDown: boolean;
    mouseDragging: boolean;
    simIsRunning: boolean;
    haveGraphState: boolean;
};

function initialLocalState(): LocalState {
    return {
        activeHyperlinks: false, // hack: remove eventually
        mouseButtonDown: false,
        mouseDragging: false,
        simIsRunning: false,
        haveGraphState: false,
    };
}

enum ActionType {
    ToggleHyperlinks,
    MouseButtonDown,
    MouseButtonUp,
    MouseDraggingStart,
    MouseDraggingStop,
    SimIsRunning,
}

type Action = {
    type: ActionType;
    data?: any;
};

function reducer(state: LocalState, action: Action): LocalState {
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
        default:
            throw new Error(`unknown action: ${action}`);
    }
}

export default function Graph({ id }: { id: Key }) {
    //    const appState = getAppState();

    const initialState: GraphState = {
        nodes: new Map<Key, GraphNode>(),
        arcs: new Map<string, Arc>(),
        arcArray: [],
    };
    const [graphState, setGraphState] = useState(initialState);
    const svgContainerRef = createRef();
    const [local, localDispatch] = useLocalReducer<LocalState, ActionType>(
        reducer,
        initialLocalState(),
    );

    useModalKeyboard(id, (key: string) => {
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

    function graphNodeFromSlimDeck(
        slimdeck: SlimDeck,
        important: boolean,
    ): GraphNode {
        const graphNode: GraphNode = {
            id: slimdeck.id,
            proximity: important ? 0 : 1,
            showAllConnections: true,
            deckKind: slimdeck.deckKind,
            label: slimdeck.title,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
        };
        return graphNode;
    }
    function ensureGraphNodeExists(
        gs: GraphState,
        deck: SlimDeck,
        important: boolean,
    ) {
        if (!gs.nodes.has(deck.id)) {
            gs.nodes.set(deck.id, graphNodeFromSlimDeck(deck, important));
        } else if (important) {
            let node = gs.nodes.get(deck.id)!;
            node.proximity = 0;
        }
    }

    function arcFromEdge(edge: Edge): Arc {
        return {
            fromId: edge.fromId,
            toId: edge.toId,
            refKind: edge.refKind,
            direction: edge.direction,
            lineStyle: LineStyle.Dotted,
            strength: 1,
        };
    }

    function ensureArcExists(gs: GraphState, edge: Edge) {
        let key: string = `${edge.fromId}->${edge.toId}`;
        if (!gs.arcs.has(key)) {
            gs.arcs.set(key, arcFromEdge(edge));
        }

        let fromNode = gs.nodes.get(edge.fromId)!;
        let toNode = gs.nodes.get(edge.toId)!;

        if (fromNode.proximity === 0 && toNode.proximity === 0) {
            let arc = gs.arcs.get(key)!;
            arc.lineStyle = LineStyle.Solid;
        }
    }

    // function updateGraphState() {
    //     let gs: GraphState = { ...graphState };

    //     let itr = gs.arcs.keys();
    //     gs.arcArray = [];
    //     for (let k of itr) {
    //         gs.arcArray.push(gs.arcs.get(k)!);
    //     }
    //     setGraphState(gs);
    // }

    function applyConnectivityData(connectivityData: ConnectivityData) {
        let gs: GraphState = { ...graphState };

        ensureGraphNodeExists(gs, connectivityData.sourceDeck, true);
        connectivityData.decks.forEach((deck) => {
            ensureGraphNodeExists(gs, deck, false);
        });

        connectivityData.edges.forEach((edge) => {
            ensureArcExists(gs, edge);
        });

        let itr = gs.arcs.keys();
        gs.arcArray = [];
        for (let k of itr) {
            gs.arcArray.push(gs.arcs.get(k)!);
        }
        setGraphState(gs);
    }

    function fetchedNode(id: number): boolean {
        let graphNode = graphState.nodes.get(id);
        if (graphNode) {
            if (graphNode.proximity === 0) {
                return true;
            }
        }
        return false;
    }

    function fetchGraphStateData(id: number) {
        Net.get<ConnectivityData>(`/api/graph/${id}`).then((data) => {
            applyConnectivityData(data);
        });
    }

    useEffect(() => {
        fetchGraphStateData(id);
    }, [id]);

    useEffect(() => {
        let svg = buildSvg(svgContainerRef.current, graphState);

        gUpdateGraphCallback = buildUpdateGraphCallback(svg);
        graphPhysics(graphState, gUpdateGraphCallback, function (b: boolean) {
            localDispatch(ActionType.SimIsRunning, b);
        });
    }, [graphState]);

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
                        },
                    );

                    localDispatch(ActionType.SimIsRunning, true);
                }
            }
        }
    }
    /*
    function numOpenedConnections(id: Key, gs: OldGraphState) {
          // add nodes to a set rather than count them in place
          // nodes A and B could be connected together twice (parent->child + child->parent) but this should only count as a single connection
        let s = new Set();

        gs.edges.forEach((e) => {
            if (e[0] === id) {
                const n: OldGraphNode = gs.nodes.get(e[1])!;
                if (n.expandedState !== ExpandedState.None) {
                    s.add(e[1]);
                }
            }
            if (e[1] === id) {
                const n: OldGraphNode = gs.nodes.get(e[0])!;
                if (n.expandedState !== ExpandedState.None) {
                    s.add(e[0]);
                }
            }
        });

        return s.size;
    }
*/

    function onMouseButtonUp() {
        if (local.mouseButtonDown) {
            if (local.mouseDragging) {
                const g = svgContainerRef.current.elementClickedOn;
                g.associatedNode.fx = null;
                g.associatedNode.fy = null;
                svgContainerRef.current.elementClickedOn = undefined;
                localDispatch(ActionType.MouseDraggingStop);
                /*            } else {
                let svgNode = svgContainerRef.current.elementClickedOn;

                let id = parseInt(svgNode.getAttribute("referencing_id"), 10);
                if (id) {
                    const node: OldGraphNode = graphState.nodes.get(id)!;
                    if (node.expandedState === ExpandedState.Fully) {
                        let openedNeighbours = numOpenedConnections(
                            id,
                            graphState
                        );
                        if (openedNeighbours > 1) {
                            node.expandedState = ExpandedState.Partial;
                        } else {
                            node.expandedState = ExpandedState.None;
                        }
                    } else if (node.expandedState === ExpandedState.Partial) {
                        node.expandedState = ExpandedState.Fully;
                    } else if (node.expandedState === ExpandedState.None) {
                        node.expandedState = ExpandedState.Fully;
                    }

                    // regenGraphState(graphState);
                    }
                    */
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
                svgContainerRef.current,
            );

            g.associatedNode.fx = ansx;
            g.associatedNode.fy = ansy;
        } else {
            return;
        }
    }

    function getReferencingId(svg: any): number | undefined {
        if (svg.getAttribute) {
            const attr = svg.getAttribute("referencing_id");
            if (attr) {
                let id = parseInt(attr, 10);
                return id;
            }
            if (svg.parentNode) {
                return getReferencingId(svg.parentNode);
            }
        }
        return undefined;
    }

    function onGraphClicked(event: Event) {
        const referencingId = getReferencingId(event.target);
        if (!local.mouseDragging && referencingId) {
            if (fetchedNode(referencingId)) {
                let node = graphState.nodes.get(referencingId)!;
                node.showAllConnections = !node.showAllConnections;
                setGraphState({ ...graphState });
            } else {
                fetchGraphStateData(referencingId);
            }
        }

        if (event.target instanceof SVGTextElement) {
            const target = event.target;
            if (local.activeHyperlinks) {
                console.log("active hyperlinks");
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

            <div
                ref={svgContainerRef}
                onClick={onGraphClicked}
                onMouseDown={onMouseButtonDown}
                onMouseUp={onMouseButtonUp}
                onMouseMove={onMouseMove}
            />

            <AlwaysVisibleKeyboardHelp>
                <pre>h: toggle hyperlinks</pre>
                <pre>p: previous quote</pre>
                <pre>r: random quote</pre>
            </AlwaysVisibleKeyboardHelp>
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
        "marker",
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

    // draw low priority arcs first
    let itr = graphState.arcs.keys();
    for (let k of itr) {
        let arc = graphState.arcs.get(k)!;
        let sourceNode: GraphNode = nodes.get(arc.fromId)!;
        let targetNode: GraphNode = nodes.get(arc.toId)!;
        if (sourceNode.proximity >= 1 && targetNode.proximity >= 1) {
            svg.edges.appendChild(createSvgArc(arc, sourceNode, targetNode));
        }
    }
    // draw important arcs
    itr = graphState.arcs.keys();
    for (let k of itr) {
        let arc = graphState.arcs.get(k)!;
        let sourceNode: GraphNode = nodes.get(arc.fromId)!;
        let targetNode: GraphNode = nodes.get(arc.toId)!;
        if (sourceNode.proximity < 1 || targetNode.proximity < 1) {
            svg.edges.appendChild(createSvgArc(arc, sourceNode, targetNode));
            // if ((sourceNode.proximity === 0 && sourceNode.showAllConnections) ||
            //     (targetNode.proximity === 0 && targetNode.showAllConnections)) {
            //     svg.edges.appendChild(createSvgArc(arc, sourceNode, targetNode));
            // }
        }
    }

    element.appendChild(svg.edges);

    // g of nodes
    //
    svg.nodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.nodes.setAttribute("fill", "var(--graph-edge)");
    svg.nodes.setAttribute("stroke-linecap", "round");
    svg.nodes.setAttribute("stroke-linejoin", "round");

    element.appendChild(svg.nodes);

    // render the further out nodes first
    graphState.nodes.forEach((n) => {
        if (n.proximity >= 1) {
            let [g, textNode] = createSvgNode(n);

            svg.nodes.appendChild(g);

            let textBoundingBox = textNode.getBBox();
            n.textWidth = textBoundingBox.width;
            n.textHeight = textBoundingBox.height;
        }
    });
    // render the more important nodes on top
    graphState.nodes.forEach((n) => {
        if (n.proximity < 1) {
            let [g, textNode] = createSvgNode(n);

            svg.nodes.appendChild(g);

            let textBoundingBox = textNode.getBBox();
            n.textWidth = textBoundingBox.width;
            n.textHeight = textBoundingBox.height;
        }
    });

    return svg;
}

function buildUpdateGraphCallback(svg?: any): GraphCallback {
    function updateGraphCallback(
        graphState: GraphState,
        physicsId: number,
        globalPhysicsId: number,
    ) {
        if (physicsId !== globalPhysicsId) {
            console.log("what the fuck? this should never happen");
        }
        // console.log("updateGraphCallback");
        let arcs = graphState.arcArray;
        let nodes = graphState.nodes;

        Array.from(svg.edges.children).forEach((svgEdge, i) => {
            if (arcs.length > i) {
                let source: GraphNode = nodes.get(arcs[i]!.fromId)!;
                let target: GraphNode = nodes.get(arcs[i]!.toId)!;
                let kind = arcs[i]!.refKind;

                if (kind === RefKind.RefToParent) {
                    translateEdge(svgEdge, target, source);
                } else {
                    translateEdge(svgEdge, source, target);
                }
            }
        });

        Array.from(svg.nodes.children).forEach((svgNode?: any) => {
            let id = parseInt(svgNode.getAttribute("referencing_id"), 10);
            let node: GraphNode | undefined = nodes.get(id);
            if (node) {
                translateNode(svgNode, node.x, node.y);
            }
        });

        // let dbg = svg.debug.children[0];
        // dbg.textContent = `${graphState.simStats.tickCount} ${graphState.simStats.maxVelocities[0]} ${graphState.simStats.maxVelocities[1]}`;
        // dbg.setAttribute("x", xmin + 20);
        // dbg.setAttribute("y", ymin + 20);
    }

    return updateGraphCallback;
}

function createSvgArc(arc: Arc, sourceNode: GraphNode, targetNode: GraphNode) {
    const strength: number = Math.abs(arc.strength);
    const kind: RefKind = arc.refKind;

    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    let width = 1.0 + strength * 0.5;
    path.setAttribute("stroke-width", `${width}`);

    if (arc.lineStyle === LineStyle.Dotted) {
        path.setAttribute("stroke-dasharray", "4,10");
    }

    switch (kind) {
        case RefKind.Ref:
            if (arc.lineStyle === LineStyle.Dotted) {
                path.setAttribute("stroke", "var(--graph-edge-dimmed)");
            } else {
                path.setAttribute("stroke", "var(--graph-edge)");
            }
            translateEdge(path, sourceNode, targetNode);
            break;
        case RefKind.RefToParent:
            if (arc.lineStyle === LineStyle.Dotted) {
                path.setAttribute("stroke", "var(--graph-edge-dimmed)");
            } else {
                path.setAttribute("stroke", "var(--graph-edge)");
            }
            path.setAttribute(
                "marker-end",
                `url(${window.location}#arrow-head)`,
            );
            translateEdge(path, targetNode, sourceNode);
            break;
        case RefKind.RefToChild:
            if (arc.lineStyle === LineStyle.Dotted) {
                path.setAttribute("stroke", "var(--graph-edge-dimmed)");
            } else {
                path.setAttribute("stroke", "var(--graph-edge)");
            }
            path.setAttribute(
                "marker-end",
                `url(${window.location}#arrow-head)`,
            );
            translateEdge(path, sourceNode, targetNode);
            break;
        case RefKind.RefInContrast:
            if (arc.lineStyle === LineStyle.Dotted) {
                path.setAttribute(
                    "stroke",
                    "var(--graph-edge-in-contrast-dimmed)",
                );
            } else {
                path.setAttribute("stroke", "var(--graph-edge-in-contrast)");
            }
            translateEdge(path, sourceNode, targetNode);
            break;
        case RefKind.RefCritical:
            if (arc.lineStyle === LineStyle.Dotted) {
                path.setAttribute(
                    "stroke",
                    "var(--graph-edge-critical-dimmed)",
                );
            } else {
                path.setAttribute("stroke", "var(--graph-edge-critical)");
            }
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

    if (n.proximity === 0) {
        let circledges = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
        );
        circledges.setAttribute("fill", "var(--graph-edge)");
        circledges.setAttribute("r", "8");
        g.appendChild(circledges);

        circledges = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle",
        );
        circledges.setAttribute("fill", "var(--bg)");
        circledges.setAttribute("r", "6");
        g.appendChild(circledges);
    }

    let circle;
    circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("fill", `var(--graph-node-proximity-${n.proximity})`);
    circle.setAttribute("r", "4");
    g.appendChild(circle);

    let text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");

    if (n.proximity <= 1) {
        text2.setAttribute("fill", "var(--fg-" + n.deckKind + ")");
    } else {
        text2.setAttribute("fill", "var(--graph-edge-dimmed)");
    }

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
