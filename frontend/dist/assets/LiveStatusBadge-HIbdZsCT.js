import{c as i,j as e,C as x}from"./index-C4Zpd4xR.js";import{R as d}from"./refresh-cw-FCqQG4yw.js";/**
 * @license lucide-react v0.303.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=i("WifiOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M8.5 16.5a5 5 0 0 1 7 0",key:"sej527"}],["path",{d:"M2 8.82a15 15 0 0 1 4.17-2.65",key:"11utq1"}],["path",{d:"M10.66 5c4.01-.36 8.14.9 11.34 3.76",key:"hxefdu"}],["path",{d:"M16.85 11.25a10 10 0 0 1 2.22 1.68",key:"q734kn"}],["path",{d:"M5 13a10 10 0 0 1 5.24-2.76",key:"piq4yl"}],["line",{x1:"12",x2:"12.01",y1:"20",y2:"20",key:"of4bc4"}]]);/**
 * @license lucide-react v0.303.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=i("Wifi",[["path",{d:"M5 13a10 10 0 0 1 14 0",key:"6v8j51"}],["path",{d:"M8.5 16.5a5 5 0 0 1 7 0",key:"sej527"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["line",{x1:"12",x2:"12.01",y1:"20",y2:"20",key:"of4bc4"}]]),g=({connected:n,lastUpdated:r,isRefreshing:s,onRefresh:o})=>{const l=t=>t.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),c=t=>{const a=Math.floor((new Date-t)/1e3);return a<60?"Just now":a<120?"1 min ago":a<3600?`${Math.floor(a/60)} mins ago`:l(t)};return e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"flex items-center gap-2",children:n?e.jsxs(e.Fragment,{children:[e.jsx(f,{size:16,className:"text-green-500"}),e.jsx("span",{className:"text-sm text-green-600 font-medium",children:"Live"})]}):e.jsxs(e.Fragment,{children:[e.jsx(m,{size:16,className:"text-gray-400"}),e.jsx("span",{className:"text-sm text-gray-500",children:"Offline"})]})}),e.jsxs("div",{className:"flex items-center gap-2 text-sm text-gray-600",children:[e.jsx(x,{size:14}),e.jsxs("span",{children:["Updated: ",c(r)]})]}),e.jsx("button",{onClick:o,disabled:s,className:`
          p-2 rounded-lg transition-all duration-200
          ${s?"bg-gray-100 text-gray-400 cursor-not-allowed":"bg-teal/10 text-teal hover:bg-teal/20 hover:rotate-180"}
        `,title:"Refresh rooms",children:e.jsx(d,{size:16,className:s?"animate-spin":""})})]})};export{g as L,f as W};
