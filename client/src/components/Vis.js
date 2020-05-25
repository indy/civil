import React, { useState, useRef, useEffect } from 'react';
import { useStateValue } from '../lib/StateProvider';
import { buildConnectivity } from '../lib/utils';
import {
  event,
  drag,
  select,
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceLink,
  forceX,
  forceY
} from 'd3';


function buildGraph(state, id, depth, onlyIdeas) {

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

  return {
    nodes: resNodes,
    links: resEdges
  };
}

export default function Vis({ id, depth, onlyIdeas }) {
  const [state] = useStateValue();

  const [data] = useState([]);
  const svgRef = useRef();

  // will be called initially and on every data change
  useEffect(() => {
    const svg = select(svgRef.current);

    let types = ["suit"];
    let data = buildGraph(state, id, depth, onlyIdeas);

    {
      const links = data.links.map(d => Object.create(d));
      // console.log(links);
      //
      // between the creation of links and the console.log on the following line,
      // some values are mysteriously added to the elements of links?
      // FUCKING JAVASCRIPT SHIT
      // nothing is predictable

      const nodes = data.nodes.map(d => Object.create(d));

      // forceCollide for rectangles:
      // https://bl.ocks.org/cmgiven/547658968d365bcc324f3e62e175709b

      const simulation = forceSimulation(nodes)
            .force("link", forceLink(links).id(d => d.id))
            .force("charge", forceManyBody().strength(-900))
            .force('collision', forceCollide().radius(function() {
              return 40;
            }))
            .force("x", forceX())
            .force("y", forceY());

      svg
        .attr("viewBox", [-300, -300, 900, 900]) // [-width / 2, -height / 2, width, height]
        .style("font", "12px sans-serif");

      svg.append("defs").selectAll("marker")
        .data(types)
        .join("marker")
        .attr("id", d => `arrow-${d}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", "var(--fg2)")
        .attr("d", "M0,-5L10,0L0,5");

      const link = svg.append("g")
            .attr("fill", "none")
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke-width", d => 1.0 + (d.strength * 0.5))
            .attr("stroke", d => "var(--fg2)")
            .attr("marker-end", d => `url(${new URL(`#arrow-suit`, window.location)})`);

      const node = svg.append("g")
            .attr("fill", "var(--fg1)")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(mydrag(simulation));

      node.append("circle")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("r", 4);

      node.append("text")
        .attr("fill", "var(--fg)")
        .attr("x", 8)
        .attr("y", "0.31em")
        .text(d => state.ac.decks[state.deckIndexFromId[d.id]].name)
        .clone(true).lower()
        .attr("fill", "none")
        .attr("stroke", "var(--bg)") // thick 'glow' around text
        .attr("stroke-width", 3);

      simulation.on("tick", () => {
        link.attr("d", linkArc);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
      });

    }
  }, [data]);

  return (
    <div className="vis-container">
      <svg ref={svgRef}></svg>
    </div>
  );
}

const mydrag = simulation => {
  function dragstarted(d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

function linkArc(d) {
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
}
