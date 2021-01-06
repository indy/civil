import { createRef, html, route, Link, useState, useEffect } from '/lib/preact/mod.js';
import { opposingKind } from '/js/JsUtils.js';
import { useStateValue } from '/js/StateProvider.js';
import { svgTickedCheckBox, svgUntickedCheckBox, svgChevronLeft, svgChevronRight } from '/js/svgIcons.js';

import graphPhysics from "/js/graphPhysics.js";

let gUpdateGraphCallback = undefined;
let gGraphState = undefined;

export default function Graph({ id, depth, isIdea }) {
  const [state] = useStateValue();

  const [activeHyperlinks, setActiveHyperlinks] = useState(false);
  const [onlyParentChild, setOnlyParentChild] = useState(false);
  const [onlyIdea, setOnlyIdea] = useState(!!isIdea);
  const [graphDepth, setGraphDepth] = useState(depth);

  const [isDragging, setIsDragging] = useState(false);
  const [simIsRunning, setSimIsRunning] = useState(false);

  const svgContainerRef = createRef();

  useEffect(() => {
    gGraphState = buildGraphState(state, id, graphDepth, onlyIdea, onlyParentChild);
    let svg = buildSvg(svgContainerRef.current, gGraphState, id);

    gUpdateGraphCallback = buildUpdateGraphCallback(svg);
    graphPhysics(gGraphState, gUpdateGraphCallback, setSimIsRunning);

  }, [onlyParentChild, onlyIdea, graphDepth]);

  function onMouseDown(event) {
    const target = event.target;
    let g = target.parentElement;
    if (g.nodeName === "g") {
      svgContainerRef.current.elementBeingDragged = g;
      setIsDragging(true);
    }

    if (!simIsRunning) {
      // restart the simulation if it's stopped and the user starts dragging a node
      graphPhysics(gGraphState, gUpdateGraphCallback, setSimIsRunning);
      setSimIsRunning(true);
    }
  }

  function onMouseUp(event) {
    if (isDragging) {
      const g = svgContainerRef.current.elementBeingDragged;
      g.associatedNode.fx = null;
      g.associatedNode.fy = null;
      svgContainerRef.current.elementBeingDragged = undefined;
      setIsDragging(false);
    }
  }

  function onMouseMove(event) {
    if (!isDragging) {
      return;
    }

    const g = svgContainerRef.current.elementBeingDragged;

    // identify this node's corressponding entry in graphstate and set it's fx,fy values
    const [ansx, ansy] = mouseInSvg(event.layerX, event.layerY, svgContainerRef.current);

    g.associatedNode.fx = ansx;
    g.associatedNode.fy = ansy;
  }

  function onGraphClicked(event) {
    const target = event.target;

    if (activeHyperlinks) {
      if (target.id.length > 0 && target.id[0] === '/') {
        // the id looks like a url, that's good enough for us, lets go there
        route(target.id);
      }
    }
  }

  function onActivHyperlinksClicked(e) {
    e.preventDefault();
    setActiveHyperlinks(!activeHyperlinks);
  }

  function onOnlyParentChildClicked(e) {
    e.preventDefault();
    setOnlyParentChild(!onlyParentChild);
  }

  function onOnlyIdeaClicked(e) {
    e.preventDefault();
    setOnlyIdea(!onlyIdea);
  }

  function onLeftClicked(e) {
    e.preventDefault();
    setGraphDepth(Math.max(1, graphDepth - 1));
  }

  function onRightClicked(e) {
    e.preventDefault();
    setGraphDepth(Math.min(10, graphDepth + 1));
  }

  return html`
<div>
  <div class="spanne">
    <div class="spanne-entry clickable" onClick=${ onActivHyperlinksClicked }>
      <span class="spanne-icon-label">Active Hyperlinks</span>
      ${ activeHyperlinks ? svgTickedCheckBox() : svgUntickedCheckBox() }
    </div>
    <div class="spanne-entry clickable" onClick=${ onOnlyIdeaClicked }>
      <span class="spanne-icon-label">Only Ideas</span>
      ${ onlyIdea ? svgTickedCheckBox() : svgUntickedCheckBox() }
    </div>
    <div class="spanne-entry clickable" onClick=${ onOnlyParentChildClicked }>
      <span class="spanne-icon-label">Only Parent/Child References</span>
      ${ onlyParentChild ? svgTickedCheckBox() : svgUntickedCheckBox() }
    </div>
    <div class="spanne-entry">
      <span class="spanne-icon-label">Depth</span>
      <span class="clickable" onClick=${ onLeftClicked }>${ svgChevronLeft() }</span>
      <span class="spanne-icon-label">${ graphDepth }</span>
      <span class="clickable" onClick=${ onRightClicked }>${ svgChevronRight() }</span>
    </div>
  </div>
  <div class="svg-container" ref=${ svgContainerRef }
       onClick=${ onGraphClicked }
       onMouseDown=${onMouseDown}
       onMouseUp=${onMouseUp}
       onMouseMove=${onMouseMove}>
    <svg viewBox="-300, -300, 900, 900"></svg>
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

function buildSvg(ref, graphState, root_id) {
  let svg = {
    container: undefined,
    element: undefined,
    edges: undefined,
    nodes: undefined,
    debug: undefined
  };

  svg.container = ref;

  while(svg.container.firstChild) { svg.container.firstChild.remove();};

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

  /*
  // g of debug
  svg.debug = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  let text1 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
  text1.setAttribute("fill", "none");
  text1.setAttribute("x", "10");
  text1.setAttribute("y", "0");
  text1.setAttribute("stroke", "var(--fg)");
  text1.setAttribute("stroke-width", "1");
  text1.textContent = "shabba";
  svg.debug.appendChild(text1);
  svg.appendChild(svg.debug);
  */

/*
  // g of axis rendering
  //
  let origin = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  let origin_x = document.createElementNS("http://www.w3.org/2000/svg", 'path');
  origin_x.setAttribute("fill", "none");
  origin_x.setAttribute("stroke-width", `3`);
  origin_x.setAttribute("stroke", 'var(--bg1)');
  origin_x.setAttribute("d", "M-100,0L100,0");
  origin.appendChild(origin_x);
  let origin_y = document.createElementNS("http://www.w3.org/2000/svg", 'path');
  origin_y.setAttribute("fill", "none");
  origin_y.setAttribute("stroke-width", `3`);
  origin_y.setAttribute("stroke", 'var(--bg1)');
  origin_y.setAttribute("d", "M0,-100L0,100");
  origin.appendChild(origin_y);
  svg.appendChild(origin);
*/
  // g of edges
  //
  svg.edges = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  svg.edges.setAttribute("fill", "none");

  // build the edges
  let nodes = graphState.nodes;

  graphState.edges.forEach(e => {
    let sourceNode = nodes[e[0]];
    let targetNode = nodes[e[1]];
    let strength = e[2];
    let kind = e[3];
    svg.edges.appendChild(createSvgEdge(sourceNode, targetNode, strength, kind));
  });

  element.appendChild(svg.edges);

  // g of nodes
  //
  svg.nodes = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  svg.nodes.setAttribute("fill", "var(--graph-edge)");
  svg.nodes.setAttribute("stroke-linecap", "round");
  svg.nodes.setAttribute("stroke-linejoin", "round");

  element.appendChild(svg.nodes);

  graphState.nodes.forEach(n => {
    let [g, textNode] = createSvgNode(n, root_id);
    svg.nodes.appendChild(g);

    let textBoundingBox = textNode.getBBox();
    n.textWidth = textBoundingBox.width;
    n.textHeight = textBoundingBox.height;
//    console.log(g);
//    console.log(g.children[0]);
//    let h = -textBoundingBox.height;
//    g.children[0].setAttribute("width", "" + textBoundingBox.width);
//    g.children[0].setAttribute("height", "" + textBoundingBox.height);
//    g.children[0].setAttribute("y", "" + h);

  });

  return svg;
}

function buildUpdateGraphCallback(svg) {

  function updateGraphCallback(graphState) {
    let edges = graphState.edges;
    let nodes = graphState.nodes;

    Array.from(svg.edges.children).forEach((svgEdge, i) => {
      let source = nodes[edges[i][0]];
      let target = nodes[edges[i][1]];
      let kind = edges[i][3];

      if (kind === "ref_to_parent") {
        translateEdge(svgEdge, target, source);
      } else {
        translateEdge(svgEdge, source, target);
      }
    });

    Array.from(svg.nodes.children).forEach((svgNode, i) => {
      translateNode(svgNode, nodes[i].x, nodes[i].y);
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
  } else if (kind === "ref_to_parent") {
    path.setAttribute("stroke", 'var(--graph-edge)');
    path.setAttribute("marker-end", `url(${window.location}#arrow-head)`);
    translateEdge(path, targetNode, sourceNode);
  } else if (kind === "ref_to_child") {
    path.setAttribute("stroke", 'var(--graph-edge)');
    path.setAttribute("marker-end", `url(${window.location}#arrow-head)`);
    translateEdge(path, sourceNode, targetNode);
  } else if (kind === "ref_in_contrast") {
    path.setAttribute("stroke", 'var(--graph-edge-in-contrast)');
    translateEdge(path, sourceNode, targetNode);
  } else if (kind === "ref_critical") {
    path.setAttribute("stroke", 'var(--graph-edge-critical)');
    translateEdge(path, sourceNode, targetNode);
  } else {
    console.log(kind);
  }

  return path;
}

function createSvgNode(n, root_id) {
  let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  g.associatedNode = n;

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

  if (n.id === root_id) {
    let circle2 = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    circle2.setAttribute("fill", "var(--graph-edge)");
    circle2.setAttribute("r", "8");
    g.appendChild(circle2);

    circle2 = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    circle2.setAttribute("fill", "var(--bg)");
    circle2.setAttribute("r", "6");
    g.appendChild(circle2);
  }

  let circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
  circle.setAttribute("fill", "var(--graph-edge)");
  circle.setAttribute("r", "4");
  g.appendChild(circle);

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

function buildGraphState(state, id, depth, onlyIdea, onlyParentChild) {

  function isTerminator(id) {
    return state.ac.decks[state.deckIndexFromId[id]].graph_terminator;
  }

  function allowIdeas(id) {
    return state.ac.decks[state.deckIndexFromId[id]].resource === "ideas";
  }
  function allowAll(id) {
    return true;
  }

  let usedSet = new Set();
  let connectionArr = buildConnectivity(state.fullGraph, id, depth, onlyIdea ? allowIdeas : allowAll, onlyParentChild, isTerminator);

  let resEdges = [];
  for (let [source, target, strength, kind] of connectionArr) {
    usedSet.add(source);
    usedSet.add(target);

    resEdges.push({source, target, strength, kind});
  }

  let resNodes = [];
  for (let u of usedSet) {
    resNodes.push({id: u});
  }

  // id => index object
  let idToIndex = {};
  let graphState = {};
  graphState.nodes = resNodes.map((n, i) => {
    idToIndex[n.id] = i;
    return {
      id: n.id,
      resource: state.ac.decks[state.deckIndexFromId[n.id]].resource,
      label: state.ac.decks[state.deckIndexFromId[n.id]].name,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    }
  });

  graphState.edges = resEdges.map(n => {
    return [idToIndex[n.source], idToIndex[n.target], n.strength, n.kind];
  });

  return graphState;
}

function buildConnectivity(fullGraph, deckId, depth, isNodeUsedFn, onlyParentChild, isTerminatorFn) {
  let resultSet = new Set();
  let futureSet = new Set();    // nodes to visit
  let activeSet = new Set();    // nodes being visited in the current pass
  let visitedSet = new Set();   // nodes already processed

  if (fullGraph[deckId]) {
    // start with this 'root' node
    if (isNodeUsedFn(deckId)) {
      futureSet.add(deckId);
    }

    for (let i = 0; i < depth; i++) {
      // populate the active set
      activeSet.clear();
      for (let f of futureSet) {
        if (!visitedSet.has(f) && !isTerminatorFn(f)) {
          // haven't processed this node so add it to activeSet
          activeSet.add(f);
        }
      }

      for (let a of activeSet) {
        let conn = fullGraph[a];
        if (conn) {
          conn.forEach(([id, kind, strength]) => {
            if (isNodeUsedFn(id) &&
                ((onlyParentChild && (kind === 'ref_to_parent' || kind === 'ref_to_child'))
                 || !onlyParentChild)) {
              // add a link between a and id
              resultSet.add([a, id, kind, strength]);
              if (!visitedSet.has(id)) {
                futureSet.add(id);
              }
            }
          });
        }
        visitedSet.add(a);
      }
    }
  }

  // set will now contain some redundent connections
  // e.g. [123, 142, 'ref', 1] as well as [142, 123, 'ref', -1]
  // remove these negative strength dupes, however there may still be some
  // negative strength entries which represent incoming only connections,
  // these need to be retained (but with their from,to swapped around and
  // strength negated)
  //

  let checkSet = {};
  let res = [];
  for (let [from, to, kind, strength] of resultSet) {
    if (strength > 0) {
      res.push([from, to, strength, kind]);

      if (!checkSet[from]) {
        checkSet[from] = new Set();
      }
      checkSet[from].add(to);
    }
  }

  for (let [from, to, kind, strength] of resultSet) {
    if (strength < 0) {
      if (!(checkSet[to] && checkSet[to].has(from))) {
        // an incoming connection
        res.push([to, from, -strength, opposingKind(kind)]);
        // no need to add [to, from] to checkSet, as there won't be another similar entry
      }
    }
  }

  return res;
}
