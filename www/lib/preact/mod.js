import { h, createContext, createRef, render } from '/lib/preact/preact.mjs';
import { useState, useReducer, useEffect, useLayoutEffect, useRef, useImperativeHandle, useMemo, useCallback, useContext, useDebugValue } from '/lib/preact/hooks.mjs';

import htm from '/lib/preact/htm.mjs';
const html = htm.bind(h);

import { getCurrentUrl, route, Router, Route, Link, exec, useRouter } from '/lib/preact/preact-router.js';

Router.getCurrentUrl = getCurrentUrl;
Router.route = route;
Router.Router = Router;
Router.Route = Route;
Router.Link = Link;
Router.exec = exec;
Router.useRouter = useRouter;

export { h, html, render, createContext, createRef, useState, useReducer, useEffect, useLayoutEffect, useRef, useImperativeHandle, useMemo, useCallback, useContext, useDebugValue, Router, Route, Link, route };
