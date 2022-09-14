import { createRef, html, route, Link, useState, useEffect } from '/lib/preact/mod.js';
import { opposingKind } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { svgTickedCheckBox, svgUntickedCheckBox, svgChevronLeft, svgChevronRight } from '/js/svgIcons.js';

import Net from "/js/Net.js";
import { graphPhysics } from "/js/graphPhysics.js";

let gUpdateGraphCallback = undefined;

const ExpandedState_Fully = 0;
const ExpandedState_Partial = 1;
const ExpandedState_None = 2;

async function loadFullGraph(state, dispatch) {
    let graph = await Net.get("/api/graph");

    dispatch({
        type: 'loadGraph',
        graphNodes: graph.graphNodes,
        graphConnections: graph.graphConnections
    });
}

export default function Graph({ id, depth }) {
    const [state, dispatch] = useStateValue();

    const [localState, setLocalState] = useState({
        activeHyperlinks: false, // hack: remove eventually
        mouseButtonDown: false,
        mouseDragging: false,
        simIsRunning: false,
        haveGraphState: false,
        requireLoad: false
    });
    const [graphState, setGraphState] = useState({});

    const svgContainerRef = createRef();

    function initialise() {
        let newState = {
            nodes: {},
            edges: []
        };

        newState.nodes[id] = {
            id: id,
            isImportant: true,
            expandedState: ExpandedState_Fully,
            resource: state.graph.decks[state.graph.deckIndexFromId[id]].resource,
            label: state.graph.decks[state.graph.deckIndexFromId[id]].name,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0
        };

        regenGraphState(newState);
    }

    if (state.graph.fullyLoaded && localState.requireLoad === true) {
        // console.log("initialising graph after loading in graph data");
        initialise();
        setLocalState({
            ...localState,
            requireLoad: false
        });
    }

    useEffect(() => {
        if (state.graph.fullyLoaded) {
            // console.log("initialising graph with pre-loaded graph data");
            initialise();
        } else {
            // fetch the graph data from the server,
            // dispatch the updated state,
            // and then on the next render initialise using the if statement above
            loadFullGraph(state, dispatch);
            setLocalState({
                ...localState,
                requireLoad: true
            });
        }
    }, []);

    useEffect(() => {
        let svg = buildSvg(svgContainerRef.current, graphState);

        gUpdateGraphCallback = buildUpdateGraphCallback(svg);
        graphPhysics(graphState, gUpdateGraphCallback,
                     function(b) { setLocalState({
                         ...localState,
                         simIsRunning: b
                     })});

    }, [graphState]);

    function regenGraphState(gs) {
        let nodes = {};
        let edges = [];

        // create an updated copy of all the visible nodes

        // copy over the expanded or important nodes
        for(const key in gs.nodes) {
            if (gs.nodes[key].isImportant || gs.nodes[key].expandedState !== ExpandedState_None) {
                nodes[key] = gs.nodes[key];
            }
        }

        // copy over any nodes directly connected to the expanded or important nodes
        for (const key in nodes) {
            if (nodes[key].expandedState === ExpandedState_Fully) {
                for (const link of state.graph.links[key]) {
                    let [childId, kind, strength] = link; // negative strength == backlink

                    if (!nodes[childId]) {
                        if (gs.nodes[childId]) {
                            // copy over from previous state
                            nodes[childId] = gs.nodes[childId];
                        } else {
                            // create a new node
                            nodes[childId] = {
                                id: childId,
                                isImportant: false,
                                expandedState: ExpandedState_None,
                                resource: state.graph.decks[state.graph.deckIndexFromId[childId]].resource,
                                label: state.graph.decks[state.graph.deckIndexFromId[childId]].name,
                                x: nodes[key].x,
                                y: nodes[key].y,
                                vx: -nodes[key.vx],
                                vy: -nodes[key.vy]
                            }
                        }
                    }
                }
            } else if (nodes[key].expandedState === ExpandedState_Partial) {
                for (const link of state.graph.links[key]) {
                    let [childId, kind, strength] = link; // negative strength == backlink

                    if (!nodes[childId]) {
                        if (gs.nodes[childId] && gs.nodes[childId].expandedState !== ExpandedState_None) {
                            // copy over from previous state
                            nodes[childId] = gs.nodes[childId];
                        }
                    }
                }
            }
        }

        // update links
        for (const key in nodes) {
            if (nodes[key].expandedState === ExpandedState_Fully) {
                for (const link of state.graph.links[key]) {
                    let [childId, kind, strength] = link; // negative strength == backlink
                    if (nodes[childId]) {
                        // only if both sides of the link are being displayed
                        edges.push([parseInt(key, 10), childId, strength, kind]);
                    }
                }
            } else if (nodes[key].expandedState === ExpandedState_Partial) {
                for (const link of state.graph.links[key]) {
                    let [childId, kind, strength] = link; // negative strength == backlink
                    if (nodes[childId] && nodes[childId].expandedState !== ExpandedState_None) {
                        // only if both sides of the link are being displayed
                        edges.push([parseInt(key, 10), childId, strength, kind]);
                    }
                }
            }
        }

        // remove edges that would be duplicates (edges that are duplicates of
        // existing edges but have their  source/target swapped and a negated strength)
        //
        let edgesToRender = [];
        edges.forEach(e => {
            let [srcIdx, targetIdx, strength, kind] = e;

            let sourceNode = nodes[srcIdx];
            let targetNode = nodes[targetIdx];

            if (strength < 0) {
                // only render negative strengths if there is no positive complement
                //
                if (!edges.some(f => f[0] === targetIdx && f[1] === srcIdx && f[2] > 0)) {
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
            edges: edgesToRender
        };

        setGraphState(updatedGraphState);
    }

    function onMouseButtonDown(event) {
        const target = event.target;
        let g = target.parentElement;
        if (g.nodeName === "g") {
            svgContainerRef.current.elementClickedOn = g;
            setLocalState({
                ...localState,
                mouseButtonDown: true
            });
        }

        if (!localState.simIsRunning) {
            // restart the simulation if it's stopped and the user starts dragging a node
            // graphPhysics(graphState, gUpdateGraphCallback, setSimIsRunning);
            graphPhysics(graphState, gUpdateGraphCallback, function(b) { setLocalState({
                ...localState,
                simIsRunning: b
            })});

            setLocalState({
                ...localState,
                simIsRunning: true
            });
        }
    }


    function numOpenedConnections(id, gs) {
        /*
          add nodes to a set rather than count them in place
          nodes A and B could be connected together twice (parent->child + child->parent) but this should only count as a single connection
        */

        let s = new Set();

        gs.edges.forEach(e => {
            if (e[0] === id) {
                if (gs.nodes[e[1]].expandedState !== ExpandedState_None) {
                    s.add(e[1]);
                }
            }
            if (e[1] === id) {
                if (gs.nodes[e[0]].expandedState !== ExpandedState_None) {
                    s.add(e[0]);
                }
            }
        });

        return s.size;
    }

    function onMouseButtonUp(event) {
        if (localState.mouseButtonDown) {
            if (localState.mouseDragging) {
                const g = svgContainerRef.current.elementClickedOn;
                g.associatedNode.fx = null;
                g.associatedNode.fy = null;
                svgContainerRef.current.elementClickedOn = undefined;
                setLocalState({
                    ...localState,
                    mouseDragging: false
                });
            } else {
                let svgNode = svgContainerRef.current.elementClickedOn;

                let id = parseInt(svgNode.getAttribute("referencing_id"), 10);
                if (id) {
                    if (graphState.nodes[id].expandedState === ExpandedState_Fully) {
                        let openedNeighbours = numOpenedConnections(id, graphState);
                        if (openedNeighbours > 1) {
                            graphState.nodes[id].expandedState = ExpandedState_Partial;
                        } else {
                            graphState.nodes[id].expandedState = ExpandedState_None;
                        }
                    } else if (graphState.nodes[id].expandedState === ExpandedState_Partial) {
                        graphState.nodes[id].expandedState = ExpandedState_Fully;
                    } else if (graphState.nodes[id].expandedState === ExpandedState_None) {
                        graphState.nodes[id].expandedState = ExpandedState_Fully;
                    };

                    regenGraphState(graphState);
                }
            }
            setLocalState({
                ...localState,
                mouseButtonDown: false
            });

        }
    }

    function onMouseMove(event) {
        if (localState.mouseButtonDown) {
            setLocalState({
                ...localState,
                mouseDragging: true
            });

            const g = svgContainerRef.current.elementClickedOn;

            // identify this node's corressponding entry in graphstate and set it's fx,fy values
            const [ansx, ansy] = mouseInSvg(event.pageX, event.pageY, svgContainerRef.current);

            g.associatedNode.fx = ansx;
            g.associatedNode.fy = ansy;

        } else {
            return;
        }
    }

    function onGraphClicked(event) {
        const target = event.target;

        if (localState.activeHyperlinks) {
            if (target.id.length > 0 && target.id[0] === '/') {
                // the id looks like a url, that's good enough for us, lets go there
                route(target.id);
            }
        }
    }

    function onActivHyperlinksClicked(e) {
        e.preventDefault();
        setLocalState({
            ...localState,
            activeHyperlinks: !localState.activeHyperlinks
        });
    }

    return html`
    <div>
        <div class="left-margin">
            <div class="left-margin-entry clickable" onClick=${ onActivHyperlinksClicked }>
                <span class="left-margin-icon-label">Active Hyperlinks</span>
                ${ localState.activeHyperlinks ? svgTickedCheckBox() : svgUntickedCheckBox() }
            </div>
        </div>
        <div class="svg-container"
             ref=${ svgContainerRef }
             onClick=${ onGraphClicked }
             onMouseDown=${onMouseButtonDown}
             onMouseUp=${onMouseButtonUp}
             onMouseMove=${onMouseMove}>
        </div>
    </div>`;
}

function mouseInSvg(mouseX, mouseY, svgContainer) {
    const svgElement = svgContainer.firstChild;

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
}

function buildSvg(ref, graphState) {

    let svg = {
        container: undefined,
        element: undefined,
        edges: undefined,
        nodes: undefined,
        debug: undefined
    };

    svg.container = ref;

    while(svg.container.firstChild) { svg.container.firstChild.remove();};

    if (Object.keys(graphState).length === 0) {
        // graphState is the empty object
        return svg;
    }

    let element = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    element.setAttribute("viewBox", "-300, -300, 900, 900");

    svg.element = element;
    svg.container.appendChild(svg.element);

    // defs for marker ends
    //
    let defs = document.createElementNS("http://www.w3.org/2000/svg", 'defs');
    let marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
    marker.setAttribute("id", "arrow-head");
    marker.setAttribute("viewBox", "0 -5 10 10");
    marker.setAttribute("refX", "15");
    marker.setAttribute("refY", "-0.5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto");

    let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    path.setAttribute("fill", "var(--graph-edge)");
    path.setAttribute("d", "M0,-5L10,0L0,5");

    marker.appendChild(path);
    defs.appendChild(marker);
    element.appendChild(defs);

    // g of edges
    //
    svg.edges = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    svg.edges.setAttribute("fill", "none");

    // build the edges
    let nodes = graphState.nodes;

    graphState.edges.forEach(e => {
        let [srcIdx, targetIdx, strength, kind] = e;

        let sourceNode = nodes[srcIdx];
        let targetNode = nodes[targetIdx];

        svg.edges.appendChild(createSvgEdge(sourceNode, targetNode, Math.abs(strength), kind));
    });

    element.appendChild(svg.edges);

    // g of nodes
    //
    svg.nodes = document.createElementNS("http://www.w3.org/2000/svg", 'g');
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

function buildUpdateGraphCallback(svg) {

    function updateGraphCallback(graphState, physicsId, globalPhysicsId) {

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

                if (kind === "refToParent") {
                    translateEdge(svgEdge, target, source);
                } else {
                    translateEdge(svgEdge, source, target);
                }
            }
        });

        Array.from(svg.nodes.children).forEach((svgNode, i) => {
            let id = svgNode.getAttribute("referencing_id");
            let nid = parseInt(id, 10);
            if (nodes[nid]) {
                if (nodes[nid].x) {
                    translateNode(svgNode, nodes[nid].x, nodes[nid].y);
                } else {
                    console.log("what???");
                }

            }
        });

        // let dbg = svg.debug.children[0];
        // dbg.textContent = `${graphState.simStats.tickCount} ${graphState.simStats.maxVelocities[0]} ${graphState.simStats.maxVelocities[1]}`;
        // dbg.setAttribute("x", xmin + 20);
        // dbg.setAttribute("y", ymin + 20);
    }

    return updateGraphCallback;
}

function createSvgEdge(sourceNode, targetNode, strength, kind) {
    let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');

    let width = 1.0 + (strength * 0.5);
    path.setAttribute("stroke-width", `${width}`);

    if (kind === "ref") {
        path.setAttribute("stroke", 'var(--graph-edge)');
        translateEdge(path, sourceNode, targetNode);
    } else if (kind === "refToParent") {
        path.setAttribute("stroke", 'var(--graph-edge)');
        path.setAttribute("marker-end", `url(${window.location}#arrow-head)`);
        translateEdge(path, targetNode, sourceNode);
    } else if (kind === "refToChild") {
        path.setAttribute("stroke", 'var(--graph-edge)');
        path.setAttribute("marker-end", `url(${window.location}#arrow-head)`);
        translateEdge(path, sourceNode, targetNode);
    } else if (kind === "refInContrast") {
        path.setAttribute("stroke", 'var(--graph-edge-in-contrast)');
        translateEdge(path, sourceNode, targetNode);
    } else if (kind === "refCritical") {
        path.setAttribute("stroke", 'var(--graph-edge-critical)');
        translateEdge(path, sourceNode, targetNode);
    } else {
        console.log(kind);
    }

    return path;
}

function createSvgNode(n) {
    let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
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
    let text1 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
    text1.setAttribute("fill", "none");
    text1.setAttribute("x", "10");
    text1.setAttribute("y", "0");
    text1.setAttribute("stroke", "var(--bg)");
    text1.setAttribute("stroke-width", "3");
    text1.textContent = label;
    text1.classList.add("unselectable-text");
    g.appendChild(text1);

    if (n.isImportant) {
        let circledges = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circledges.setAttribute("fill", "var(--graph-edge)");
        circledges.setAttribute("r", "8");
        g.appendChild(circledges);

        circledges = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circledges.setAttribute("fill", "var(--bg)");
        circledges.setAttribute("r", "6");
        g.appendChild(circledges);
    }

    let circle;
    switch(n.expandedState) {
    case ExpandedState_Fully:
        circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circle.setAttribute("fill", "var(--graph-node-expanded)");
        circle.setAttribute("r", "4");
        g.appendChild(circle);
        break;
    case ExpandedState_Partial:
        circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circle.setAttribute("fill", "var(--graph-node-partial)");
        circle.setAttribute("r", "4");
        g.appendChild(circle);
        break;
    case ExpandedState_None:
        circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
        circle.setAttribute("fill", "var(--graph-node-minimised)");
        circle.setAttribute("r", "4");
        g.appendChild(circle);
        break;
    }

    let text2 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
    text2.setAttribute("fill", "var(--fg-" + n.resource + ")");
    text2.setAttribute("x", "10");
    text2.setAttribute("y", "0");
    text2.textContent = label;
    text2.id = `/${n.resource}/${n.id}`;
    text2.classList.add("svg-pseudo-link");
    text2.classList.add("unselectable-text"); // don't highlight the text as it's being dragged
    g.appendChild(text2);

    return [g, text2];
}

function translateEdge(svgNode, source, target) {
    const r = Math.hypot(target.x - source.x, target.y - source.y);
    let d = `M${source.x},${source.y} A${r},${r} 0 0,1 ${target.x},${target.y}`;
    svgNode.setAttribute("d", d);
}

function translateNode(svgNode, x, y) {
    svgNode.setAttribute("transform", `translate(${x},${y})`);
}
