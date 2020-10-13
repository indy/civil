import { h, createContext, createRef, render } from '/lib/preact/preact.js';
import { useState, useReducer, useEffect, useLayoutEffect, useRef, useImperativeHandle, useMemo, useCallback, useContext, useDebugValue } from '/lib/preact/hooks.js';
import htm from '/lib/preact/htm.js';
import { Router, Route, Link, route } from '/lib/preact/preact-router.js';

const html = htm.bind(h);

export { h, html, render, createContext, createRef, useState, useReducer, useEffect, useLayoutEffect, useRef, useImperativeHandle, useMemo, useCallback, useContext, useDebugValue, Router, Route, Link, route };
