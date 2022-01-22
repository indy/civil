function buildColourConversionFn(rgb_from_hsl) {
  return (hsl) => {
    function clamp(value, min, max) {
      return value < min ? min : (value > max ? max : value);
    }

    function componentAsHexString(c) {
      let hex = c.toString(16);
      if (hex.length < 2) {
        hex = "0" + hex;
      }
      return hex;
    }

    const transportRGB = rgb_from_hsl(hsl[0], hsl[1], hsl[2]);

    let r = Math.floor(clamp(transportRGB.get_0(), 0, 1) * 255);
    let g = Math.floor(clamp(transportRGB.get_1(), 0, 1) * 255);
    let b = Math.floor(clamp(transportRGB.get_2(), 0, 1) * 255);

    transportRGB.free();

    return "#" + componentAsHexString(r) + componentAsHexString(g) + componentAsHexString(b);
  }
}

function augmentSettingsWithCssModifierParameters(uiColours) {
  let root = document.body;
  let mode = getComputedStyle(root).getPropertyValue("--mode").trim();

  let s;

  if (mode === "light") {
    s = {
      ...uiColours,

      // definitions are either hsl triplets or strings that reference the clock values
      //
      definitions: {
        bg:  [46.5, 19.2,  95.7],
        bg1: [85.7,  4.5,  93.9],
        bg2: [46.1, 20.2,  92.0],
        bg3: [16.7,  0.0, 100.0],

        fg:  [43,  19,  3.5],
        fg1: [16.7, 0, 40.7],
        fg_inactive: [16.7, 0, 60],

        divider: [16.7, 0, 77.7],

        graph_node_expanded: [127, 60, 70],
        graph_node_partial: [37, 60, 70],
        graph_node_minimised: [0, 0, 70],
        graph_edge: [0, 0, 70],
        graph_edge_in_contrast: [217, 60, 70],
        graph_edge_critical: [7, 60, 70],

        scribble_neutral: [247, 100, 50],
        scribble_disagree: [7, 100, 50],
        hyperlink: [247, 60, 50],
        highlight: [85, 100, 90],

        bg_ideas: "--bg-clock-06",
        bg_articles: "--bg-clock-12",
        bg_people: "--bg-clock-09",
        bg_timelines: "--bg-clock-03",

        fg_ideas: "--fg-clock-06",
        fg_articles: "--fg-clock-12",
        fg_people: "--fg-clock-09",
        fg_timelines: "--fg-clock-03",
      },

      hueDelta: 30,

      // used to generate the fg clock values
      saturationFg: 60.5,
      hueOffsetFg: 67.1,
      lightnessFg: 50.0,

      // used to generate the bg clock values
      saturationBg: 57.6,
      hueOffsetBg: 65.7,
      lightnessBg: 89.9,
    }
  } else {

    s = {
      ...uiColours,

      // definitions are either hsl triplets or strings that reference the clock values
      //
      definitions: {
        bg:  [46.5, 19.2,  95.7],
        bg1: [85.7,  4.5,  93.9],
        bg2: [46.1, 20.2,  92.0],
        bg3: [16.7,  0.0, 100.0],

        fg:  [43,  19,  3.5],
        fg1: [16.7, 0, 40.7],
        fg_inactive: [16.7, 0, 60],

        divider: [16.7, 0, 77.7],

        graph_node_expanded: [127, 60, 70],
        graph_node_partial: [37, 60, 70],
        graph_node_minimised: [0, 0, 70],
        graph_edge: [0, 0, 70],
        graph_edge_in_contrast: [217, 60, 70],
        graph_edge_critical: [7, 60, 70],

        scribble_neutral: [247, 100, 50],
        scribble_disagree: [7, 100, 50],
        hyperlink: [247, 60, 50],
        highlight: [85, 100, 90],

        bg_ideas: "--bg-clock-06",
        bg_articles: "--bg-clock-12",
        bg_people: "--bg-clock-09",
        bg_timelines: "--bg-clock-03",

        fg_ideas: "--fg-clock-06",
        fg_articles: "--fg-clock-12",
        fg_people: "--fg-clock-09",
        fg_timelines: "--fg-clock-03",
      },

      hueDelta: 30,

      // used to generate the fg clock values
      saturationFg: 60.5,
      hueOffsetFg: 67.1,
      lightnessFg: 50.0,

      // used to generate the bg clock values
      saturationBg: 57.6,
      hueOffsetBg: 65.7,
      lightnessBg: 89.9,
    }
  }
  return s;
}

function declareCssVariables(uiColours, rgbFromHsl) {
  let root = document.body;

  function cssFromUnderscore(name) {
    let cssName = '--' + name.replaceAll('_', '-');
    return cssName;
  }

  let hueFg, hueBg, rgb, index;
  for(let i = 0; i < 12; i++) {
    hueFg = uiColours.hueOffsetFg + ( i * uiColours.hueDelta);
    hueBg = uiColours.hueOffsetBg + ( i * uiColours.hueDelta);

    index = indexAsString(i);

    rgb = rgbFromHsl([hueFg, uiColours.saturationFg, uiColours.lightnessFg]);
    root.style.setProperty(`--fg-clock-${index}`, rgb);

    rgb = rgbFromHsl([hueBg, uiColours.saturationBg, uiColours.lightnessBg]);
    root.style.setProperty(`--bg-clock-${index}`, rgb);
  }

  Object.keys(uiColours.definitions).forEach(key => {
    let cssName = cssFromUnderscore(key);
    let value = uiColours.definitions[key];

    if (Array.isArray(value)) {
      let hsl = value;
      let rgb = rgbFromHsl(hsl);
      root.style.setProperty(cssName, rgb);
    } else {
      let clockName = value;
      let source = getComputedStyle(root).getPropertyValue(clockName);
      root.style.setProperty(cssName, source);
    }
  });
}

function indexAsString(i) {
  if (i === 0) {
    return "12";
  } else if (i < 10) {
    return `0${i}`;
  } else {
    return `${i}`;
  }
}

export { buildColourConversionFn, declareCssVariables, augmentSettingsWithCssModifierParameters }
