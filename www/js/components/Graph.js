import { createRef, html, route, Link, useState, useEffect } from '/js/ext/library.js';

import { useStateValue } from '/js/lib/StateProvider.js';

import graphPhysics from "/js/lib/graphPhysics.js";
// import { useHistory } from 'react-router-dom';

export default function Graph({ id, depth, onlyIdeas }) {
  // let history = useHistory();
  const [state] = useStateValue();

  const [data] = useState([]);
  const svgContainerRef = createRef();

  useEffect(() => {
    let graphState = buildGraphState(state, id, depth, onlyIdeas);
    let svg = buildSvg(svgContainerRef.current, graphState);
    startSimulation(graphState, svg);

  }, [data]);

  function onclick(event) {
    const target = event.target;

    if (target.id.length > 0 && target.id[0] === '/') {
      // the id looks like a url, that's good enough for us, lets go there
      // history.push(target.id);
      route(target.id, true);
    }
  }

  return html`<div class="svg-container" ref=${ svgContainerRef } onClick=${ onclick }>
                <svg viewBox="-300, -300, 900, 900"></svg>
              </div>`;
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

  let element = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
  element.setAttribute("viewBox", "-300, -300, 900, 900");
  // svg.setAttribute("viewBox", "-150, -150, 90, 150");
  // svg.setAttribute("viewBox", "-200, -200, 600, 600");

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
  path.setAttribute("fill", "var(--fg2)");
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
    svg.edges.appendChild(createSvgEdge(sourceNode, targetNode, strength));
  });

  element.appendChild(svg.edges);

  // g of nodes
  //
  svg.nodes = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  svg.nodes.setAttribute("fill", "var(--fg2)");
  svg.nodes.setAttribute("stroke-linecap", "round");
  svg.nodes.setAttribute("stroke-linejoin", "round");

  element.appendChild(svg.nodes);

  graphState.nodes.forEach(n => {
    let [g, textNode] = createSvgNode(n, -3.2103189179278937,-9.947329432729548);
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

function startSimulation(graphState, svg) {
  function updateGraphCallback() {
    let edges = graphState.edges;
    let nodes = graphState.nodes;

    Array.from(svg.edges.children).forEach((svgEdge, i) => {
      let source = nodes[edges[i][0]];
      let target = nodes[edges[i][1]];
      translateEdge(svgEdge, source, target);
    });

    Array.from(svg.nodes.children).forEach((svgNode, i) => {
      translateNode(svgNode, nodes[i].x, nodes[i].y);
    });

    let [xmin, ymin, xmax, ymax] = getBoundingBox(graphState.nodes);
    xmin -= 30;
    ymin -= 30;
    let width = (xmax - xmin) > 700 ? (xmax - xmin) * 1.2 : 800;
    let height = (ymax - ymin) > 700 ? (ymax - ymin) * 1.2 : 800;
    svg.element.setAttribute("viewBox", `${xmin} ${ymin} ${width} ${height}`);


    // let dbg = svg.debug.children[0];
    // dbg.textContent = `${graphState.simStats.tickCount} ${graphState.simStats.maxVelocities[0]} ${graphState.simStats.maxVelocities[1]}`;
    // dbg.setAttribute("x", xmin + 20);
    // dbg.setAttribute("y", ymin + 20);
  }

  graphPhysics(graphState, updateGraphCallback);
}



function getBoundingBox(nodes) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;

  if (nodes.length === 0) {
    return [0, 0, 1, 1];
  }

  nodes.forEach(n => {
    if (n.x < xmin) { xmin = n.x; }
    if (n.y < ymin) { ymin = n.y; }
    if (n.x + n.textWidth > xmin) { xmax = n.x + n.textWidth; }
    if (n.y + n.textHeight > ymin) { ymax = n.y + n.textHeight; }
  });

  // let xmid = (xmin + xmax) / 2;
  // let ymid = (ymin + ymax) / 2;

  return [xmin, ymin, xmax, ymax];
}

function createSvgEdge(sourceNode, targetNode, strength) {
  let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');

  let width = 1.0 + (strength * 0.5);
  path.setAttribute("stroke-width", `${width}`);
  path.setAttribute("stroke", 'var(--fg2)');
  path.setAttribute("marker-end", `url(${window.location}#arrow-head)`);

  translateEdge(path, sourceNode, targetNode);

  return path;
}

function createSvgNode(n, x, y) {
  const label = n.label;

  let g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  translateNode(g, x, y);

  // let circle2 = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
  // circle2.setAttribute("stroke", "var(--fg2)");
  // circle2.setAttribute("stroke-width", "0.5");
  // circle2.setAttribute("r", "40");
  // g.appendChild(circle2);
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
  g.appendChild(text1);

  let circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
  circle.setAttribute("stroke", "var(--fg2)");
  circle.setAttribute("stroke-width", "1.5");
  circle.setAttribute("r", "4");
  g.appendChild(circle);


  let text2 = document.createElementNS("http://www.w3.org/2000/svg", 'text');
  text2.setAttribute("fill", "var(--fg)");
  text2.setAttribute("x", "10");
  text2.setAttribute("y", "0");
  text2.textContent = label;
  text2.id = `/${n.resource}/${n.id}`;
  text2.classList.add("svg-pseudo-link");
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

function buildGraphState(state, id, depth, onlyIdeas) {

  function allowIdeas(id) {
    return state.ac.decks[state.deckIndexFromId[id]].resource === "ideas";
  }
  function allowAll(id) {
    return true;
  }

  let usedSet = new Set();
  let connectionArr = buildConnectivity(state.fullGraph, id, depth, onlyIdeas ? allowIdeas : allowAll);

  let resEdges = [];
  for (let [source, target, strength] of connectionArr) {
    usedSet.add(source);
    usedSet.add(target);

    resEdges.push({source, target, strength});
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
    return [idToIndex[n.source], idToIndex[n.target], n.strength];
  });

  return graphState;
}

function buildConnectivity(fullGraph, deckId, depth, isNodeUsed) {
  let resultSet = new Set();
  let futureSet = new Set();    // nodes to visit
  let activeSet = new Set();    // nodes being visited in the current pass
  let visitedSet = new Set();   // nodes already processed

  if (fullGraph[deckId]) {
    // start with this 'root' node
    if (isNodeUsed(deckId)) {
      futureSet.add(deckId);
    }

    for (let i = 0; i < depth; i++) {
      // populate the active set
      activeSet.clear();
      for (let f of futureSet) {
        if (!visitedSet.has(f)) {
          // haven't processed this node so add it to activeSet
          activeSet.add(f);
        }
      }

      for (let a of activeSet) {
        let conn = fullGraph[a];
        if (conn) {
          conn.forEach(([id, strength]) => {
            if (isNodeUsed(id)) {
              // add a link between a and id
              resultSet.add([a, id, strength]);
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
  // e.g. [123, 142, 1] as well as [142, 123, -1]
  // remove these negative strength dupes, however there may still be some
  // negative strength entries which represent incoming only connections,
  // these need to be retained (but with their from,to swapped around and
  // strength negated)
  //

  let checkSet = {};
  let res = [];
  for (let [from, to, strength] of resultSet) {
    if (strength > 0) {
      res.push([from, to, strength]);

      if (!checkSet[from]) {
        checkSet[from] = new Set();
      }
      checkSet[from].add(to);
    }
  }

  for (let [from, to, strength] of resultSet) {
    if (strength < 0) {
      if (!(checkSet[to] && checkSet[to].has(from))) {
        // an incoming connection
        res.push([to, from, -strength]);
        // no need to add [to, from] to checkSet, as there won't be another similar entry
      }
    }
  }

  return res;
}
