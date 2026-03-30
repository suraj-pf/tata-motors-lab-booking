import{c as l,k as t}from"./index-C4Zpd4xR.js";/**
 * @license lucide-react v0.303.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=l("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]),b={getAll:a=>t.get("/labs",{params:a}),getLabs:()=>t.get("/labs"),getLabById:a=>t.get(`/labs/${a}`),createLab:a=>t.post("/labs",a),updateLab:(a,e)=>t.put(`/labs/${a}`,e),deleteLab:a=>t.delete(`/labs/${a}`),toggleStatus:a=>t.patch(`/labs/${a}/toggle`),getLabAvailability:(a,e)=>t.get(`/labs/${a}/availability?date=${e}`),getAvailability:(a,e)=>t.get(`/labs/${a}/availability`,{params:e}),getStatistics:a=>t.get("/labs/statistics",{params:a})};export{i as I,b as l};
