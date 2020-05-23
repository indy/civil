import React, { useRef, useEffect } from 'react';


export default function Vis(props) {

  const svgRef = useRef();

  useEffect(() => {
    console.log(svgRef);
  }, []);

  return (<svg ref = { svgRef }></svg>);
}
