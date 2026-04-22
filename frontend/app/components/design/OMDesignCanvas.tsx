"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Card, Badge, TabBar,
  usePersisted,
} from "../shared";

export type OMNodeType2   = "org-unit"|"coe"|"shared-service"|"ai-node"|"role"|"governance";
export type OMEdgeType2   = "reporting"|"service"|"advisory"|"data-flow";
export type OMDesignMode2 = "current"|"target";

export interface OMNode2 {
  id: string; type: OMNodeType2; label: string;
  x: number; y: number; w: number; h: number; color: string;
  currentFte?: number; targetFte?: number; aiMaturity?: string;
  notes?: string; wave?: number; kpiIds?: string[];
}
export interface OMEdge2  { id: string; fromId: string; toId: string; type: OMEdgeType2; }
export interface OMLayer2 { id: string; label: string; y: number; height: number; color: string; }
export interface OMVersion2 { id: string; name: string; ts: string; nodes: OMNode2[]; edges: OMEdge2[]; layers: OMLayer2[]; }
export interface OMKpi2 { id: string; objectiveId: string; name: string; category: string; unit: string; currentValue: number; targetValue: number; baselineValue: number; timeframe: string; direction: "increase"|"decrease"|"maintain"; linkedNodeIds: string[]; status: "on-track"|"at-risk"|"off-track"|"achieved"; notes?: string; }
export interface OMObjective2 { id: string; name: string; description: string; priority: "critical"|"high"|"medium"|"low"; owner: string; targetDate: string; status: "on-track"|"at-risk"|"off-track"|"achieved"; }

// ── Constants ─────────────────────────────────────────────────────────────────
export const OM_NODE_CFG: Record<OMNodeType2,{icon:string;color:string;defaultW:number;defaultH:number}> = {
  "org-unit":       { icon:"⬜", color:"#f4a83a", defaultW:148, defaultH:52 },
  "coe":            { icon:"◈",  color:"#f4a83a", defaultW:148, defaultH:52 },
  "shared-service": { icon:"◉",  color:"var(--sage)", defaultW:148, defaultH:52 },
  "ai-node":        { icon:"⬡",  color:"#f4a83a", defaultW:148, defaultH:52 },
  "role":           { icon:"○",  color:"var(--coral)", defaultW:120, defaultH:44 },
  "governance":     { icon:"◇",  color:"var(--purple)", defaultW:140, defaultH:52 },
};
export const OM_EDGE_CFG: Record<OMEdgeType2,{label:string;dash:string;color:string}> = {
  "reporting": { label:"Reporting",  dash:"none",    color:"#5a5245" },
  "service":   { label:"Service",    dash:"6,3",     color:"#f4a83a" },
  "advisory":  { label:"Advisory",   dash:"3,3",     color:"#5a5245" },
  "data-flow": { label:"Data Flow",  dash:"8,2,2,2", color:"#f4a83a" },
};
export const OM_WAVE_COLOR: Record<number,string> = { 0:"var(--paper-solid)",1:"var(--sage)",2:"var(--amber)",3:"var(--amber)",4:"var(--dusk)" };
export const OM_STATUS_COLOR: Record<string,string> = { "on-track":"var(--sage)","at-risk":"var(--amber)","off-track":"var(--coral)","achieved":"var(--amber)" };

/* ═══════════════════════════════════════════════════════════════
   OM DICTIONARY — Function-scoped operating model presets
   Each entry is a real-world OM pattern a Mercer consultant might use.
   Organized by: function → industry-specific variants
   ═══════════════════════════════════════════════════════════════ */

export type OMPreset = { label: string; desc: string; industry?: string; company?: string; layers: Omit<OMLayer2,"id">[]; nodes: Omit<OMNode2,"id">[] };

export const OM_FUNCTION_PRESETS: Record<string, OMPreset[]> = {
  "HR": [
    { label: "HR Federated CoE", desc: "CoE-led centers of expertise + embedded HRBPs in business units. Most common in large multinationals.", industry: "General",
      layers: [
        {label:"CHRO Office",y:16,height:80,color:"rgba(244,168,58,0.07)"},
        {label:"Centres of Excellence",y:108,height:80,color:"rgba(74,130,196,0.07)"},
        {label:"HR Business Partners",y:200,height:80,color:"rgba(167,139,184,0.07)"},
        {label:"Shared Services / GBS",y:292,height:80,color:"rgba(74,158,107,0.07)"},
        {label:"AI & Analytics Layer",y:384,height:70,color:"rgba(232,197,71,0.07)"},
      ],
      nodes: [
        {type:"governance",label:"CHRO",x:200,y:32,w:130,h:48,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"coe",label:"Total Rewards CoE",x:30,y:124,w:148,h:48,color:"#f4a83a",currentFte:8,targetFte:6},
        {type:"coe",label:"Talent & L&D CoE",x:200,y:124,w:148,h:48,color:"#f4a83a",currentFte:12,targetFte:10},
        {type:"coe",label:"People Analytics",x:370,y:124,w:148,h:48,color:"#f4a83a",currentFte:4,targetFte:8},
        {type:"org-unit",label:"BU HRBP — Corp",x:50,y:216,w:140,h:48,color:"var(--coral)",currentFte:6,targetFte:4},
        {type:"org-unit",label:"BU HRBP — Ops",x:220,y:216,w:140,h:48,color:"var(--coral)",currentFte:8,targetFte:5},
        {type:"org-unit",label:"BU HRBP — Tech",x:390,y:216,w:140,h:48,color:"var(--coral)",currentFte:5,targetFte:3},
        {type:"shared-service",label:"HR Ops / GBS",x:60,y:308,w:150,h:48,color:"var(--sage)",currentFte:25,targetFte:16},
        {type:"shared-service",label:"Payroll & Benefits",x:240,y:308,w:150,h:48,color:"var(--sage)",currentFte:12,targetFte:8},
        {type:"shared-service",label:"Recruiting Ops",x:420,y:308,w:140,h:48,color:"var(--sage)",currentFte:10,targetFte:6},
        {type:"ai-node",label:"AI Copilot Layer",x:150,y:396,w:150,h:44,color:"#f4a83a",currentFte:0,targetFte:4,aiMaturity:"Piloting"},
        {type:"ai-node",label:"Predictive Analytics",x:330,y:396,w:150,h:44,color:"#f4a83a",currentFte:0,targetFte:3,aiMaturity:"Exploring"},
      ],
    },
    { label: "HR Centralized GBS", desc: "Single global business services center with thin HRBP layer. Efficiency-first model.", industry: "Manufacturing",
      layers: [{label:"HR Leadership",y:16,height:80,color:"rgba(244,168,58,0.07)"},{label:"Central HR Functions",y:108,height:90,color:"rgba(74,130,196,0.07)"},{label:"Global Business Services",y:210,height:90,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"CHRO",x:200,y:32,w:130,h:48,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"coe",label:"Comp & Benefits",x:40,y:124,w:148,h:48,color:"#f4a83a",currentFte:10,targetFte:7},
        {type:"coe",label:"Talent Mgmt",x:210,y:124,w:130,h:48,color:"#f4a83a",currentFte:8,targetFte:6},
        {type:"coe",label:"L&D / Academy",x:360,y:124,w:130,h:48,color:"#f4a83a",currentFte:6,targetFte:5},
        {type:"shared-service",label:"GBS — Transactional HR",x:80,y:230,w:180,h:50,color:"var(--sage)",currentFte:40,targetFte:25},
        {type:"shared-service",label:"GBS — Recruiting",x:290,y:230,w:150,h:50,color:"var(--sage)",currentFte:15,targetFte:8},
      ],
    },
  ],
  "IT": [
    { label: "IT Operating Model (ITOC)", desc: "IT Operations Center model — NOC, SOC, service desk, platform teams. Standard for enterprise IT.", industry: "General",
      layers: [
        {label:"CIO / CTO Office",y:16,height:70,color:"rgba(244,168,58,0.07)"},
        {label:"Platform & Architecture",y:98,height:80,color:"rgba(74,130,196,0.07)"},
        {label:"IT Operations Center",y:190,height:80,color:"rgba(167,139,184,0.07)"},
        {label:"Service Delivery",y:282,height:80,color:"rgba(74,158,107,0.07)"},
        {label:"Security Operations",y:374,height:70,color:"rgba(167,139,184,0.07)"},
      ],
      nodes: [
        {type:"governance",label:"CIO / CTO",x:200,y:28,w:130,h:44,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"coe",label:"Enterprise Arch",x:40,y:110,w:148,h:48,color:"#f4a83a",currentFte:5,targetFte:4},
        {type:"coe",label:"Cloud Platform",x:210,y:110,w:130,h:48,color:"#f4a83a",currentFte:12,targetFte:15},
        {type:"coe",label:"Data Platform",x:360,y:110,w:130,h:48,color:"#f4a83a",currentFte:8,targetFte:12},
        {type:"org-unit",label:"NOC",x:40,y:205,w:120,h:48,color:"var(--coral)",currentFte:15,targetFte:8},
        {type:"org-unit",label:"ITOC Command",x:180,y:205,w:148,h:48,color:"var(--coral)",currentFte:8,targetFte:6},
        {type:"org-unit",label:"Release Mgmt",x:348,y:205,w:140,h:48,color:"var(--coral)",currentFte:6,targetFte:4},
        {type:"shared-service",label:"Service Desk L1/L2",x:60,y:298,w:170,h:48,color:"var(--sage)",currentFte:30,targetFte:15},
        {type:"shared-service",label:"App Support",x:260,y:298,w:130,h:48,color:"var(--sage)",currentFte:18,targetFte:12},
        {type:"ai-node",label:"SOC / SIEM",x:120,y:386,w:130,h:44,color:"var(--purple)",currentFte:8,targetFte:10},
        {type:"ai-node",label:"AIOps",x:280,y:386,w:130,h:44,color:"#f4a83a",currentFte:0,targetFte:5,aiMaturity:"Piloting"},
      ],
    },
  ],
  "Finance": [
    { label: "Finance Federated OM", desc: "CFO-led with FP&A CoE, treasury, controllership, and shared transactional processing.", industry: "General",
      layers: [{label:"CFO Office",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"Finance CoEs",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Business Finance",y:190,height:80,color:"rgba(167,139,184,0.07)"},{label:"Shared Services",y:282,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"CFO",x:200,y:28,w:130,h:44,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"coe",label:"FP&A CoE",x:40,y:110,w:130,h:48,color:"#f4a83a",currentFte:10,targetFte:8},
        {type:"coe",label:"Treasury",x:190,y:110,w:120,h:48,color:"#f4a83a",currentFte:6,targetFte:5},
        {type:"coe",label:"Tax & Compliance",x:330,y:110,w:148,h:48,color:"#f4a83a",currentFte:8,targetFte:7},
        {type:"org-unit",label:"BU Finance BP",x:60,y:206,w:150,h:48,color:"var(--coral)",currentFte:12,targetFte:8},
        {type:"org-unit",label:"Controller",x:240,y:206,w:120,h:48,color:"var(--coral)",currentFte:8,targetFte:6},
        {type:"shared-service",label:"AP / AR / GL",x:60,y:298,w:150,h:48,color:"var(--sage)",currentFte:20,targetFte:10},
        {type:"shared-service",label:"Financial Reporting",x:240,y:298,w:160,h:48,color:"var(--sage)",currentFte:8,targetFte:5},
        {type:"ai-node",label:"AI Close Automation",x:430,y:298,w:148,h:48,color:"#f4a83a",currentFte:0,targetFte:3,aiMaturity:"Piloting"},
      ],
    },
    { label: "Finance OM — Banking", desc: "Three Lines of Defense model with front/middle/back office. Regulatory-driven.", industry: "Financial Services", company: "jpmorgan",
      layers: [{label:"CFO / Group Finance",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"1st Line — Business",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"2nd Line — Risk & Control",y:190,height:80,color:"rgba(167,139,184,0.07)"},{label:"3rd Line — Audit",y:282,height:70,color:"rgba(167,139,184,0.07)"},{label:"Shared / GBS",y:364,height:70,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"Group CFO",x:200,y:28,w:130,h:44,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"org-unit",label:"Front Office Finance",x:40,y:110,w:170,h:48,color:"#f4a83a",currentFte:30,targetFte:25},
        {type:"org-unit",label:"Product Control",x:240,y:110,w:140,h:48,color:"#f4a83a",currentFte:18,targetFte:14},
        {type:"org-unit",label:"Risk Finance",x:100,y:206,w:130,h:48,color:"var(--coral)",currentFte:15,targetFte:12},
        {type:"org-unit",label:"Regulatory Reporting",x:260,y:206,w:160,h:48,color:"var(--coral)",currentFte:12,targetFte:8},
        {type:"governance",label:"Internal Audit",x:180,y:294,w:148,h:44,color:"var(--purple)",currentFte:8,targetFte:7},
        {type:"shared-service",label:"Finance GBS",x:120,y:376,w:150,h:44,color:"var(--sage)",currentFte:40,targetFte:25},
        {type:"ai-node",label:"RegTech / AI",x:300,y:376,w:130,h:44,color:"#f4a83a",currentFte:0,targetFte:6,aiMaturity:"Scaling"},
      ],
    },
  ],
  "Legal": [
    { label: "Legal Ops OM", desc: "General Counsel led with practice groups, legal ops, and outsourced discovery.", industry: "General",
      layers: [{label:"GC Office",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"Practice Groups",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Legal Operations",y:190,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"General Counsel",x:180,y:28,w:160,h:44,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"coe",label:"Corporate / M&A",x:30,y:110,w:140,h:48,color:"#f4a83a",currentFte:6,targetFte:5},
        {type:"coe",label:"Regulatory",x:190,y:110,w:120,h:48,color:"#f4a83a",currentFte:5,targetFte:4},
        {type:"coe",label:"Employment Law",x:330,y:110,w:140,h:48,color:"#f4a83a",currentFte:4,targetFte:3},
        {type:"shared-service",label:"CLM & Contracts",x:40,y:206,w:150,h:48,color:"var(--sage)",currentFte:8,targetFte:4},
        {type:"shared-service",label:"eDiscovery",x:220,y:206,w:120,h:48,color:"var(--sage)",currentFte:6,targetFte:3},
        {type:"ai-node",label:"AI Contract Review",x:370,y:206,w:148,h:48,color:"#f4a83a",currentFte:0,targetFte:3,aiMaturity:"Piloting"},
      ],
    },
  ],
  "Supply Chain": [
    { label: "Supply Chain OM", desc: "End-to-end supply chain with planning, procurement, manufacturing, and logistics.", industry: "Manufacturing", company: "toyota",
      layers: [{label:"SVP Supply Chain",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"Planning & Procurement",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Manufacturing & Quality",y:190,height:80,color:"rgba(167,139,184,0.07)"},{label:"Logistics & Distribution",y:282,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"SVP Supply Chain",x:180,y:28,w:160,h:44,color:"#f4a83a",currentFte:1,targetFte:1},
        {type:"coe",label:"Demand Planning",x:40,y:110,w:140,h:48,color:"#f4a83a",currentFte:10,targetFte:8},
        {type:"coe",label:"Strategic Procurement",x:200,y:110,w:160,h:48,color:"#f4a83a",currentFte:8,targetFte:6},
        {type:"coe",label:"Supplier Quality",x:380,y:110,w:140,h:48,color:"#f4a83a",currentFte:6,targetFte:5},
        {type:"org-unit",label:"Plant Operations",x:60,y:206,w:150,h:48,color:"var(--coral)",currentFte:200,targetFte:180},
        {type:"org-unit",label:"Quality Control",x:240,y:206,w:140,h:48,color:"var(--coral)",currentFte:30,targetFte:22},
        {type:"org-unit",label:"EHS",x:400,y:206,w:100,h:48,color:"var(--coral)",currentFte:12,targetFte:10},
        {type:"shared-service",label:"Logistics Hub",x:80,y:298,w:150,h:48,color:"var(--sage)",currentFte:40,targetFte:30},
        {type:"shared-service",label:"Warehouse Ops",x:260,y:298,w:140,h:48,color:"var(--sage)",currentFte:35,targetFte:25},
        {type:"ai-node",label:"AI Demand Forecast",x:430,y:298,w:148,h:48,color:"#f4a83a",currentFte:0,targetFte:4,aiMaturity:"Scaling"},
      ],
    },
  ],
  "Technology (Product)": [
    { label: "Product & Eng OM", desc: "Product-led org with squads, platform teams, and SRE. Spotify-influenced.", industry: "Technology", company: "spotify",
      layers: [{label:"CPO / CTO",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"Product Tribes",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Platform & SRE",y:190,height:80,color:"rgba(74,158,107,0.07)"},{label:"Enablement",y:282,height:70,color:"rgba(232,197,71,0.07)"}],
      nodes: [
        {type:"governance",label:"CPO / CTO",x:200,y:28,w:130,h:44,color:"#f4a83a",currentFte:2,targetFte:2},
        {type:"org-unit",label:"Tribe: Growth",x:30,y:110,w:140,h:48,color:"#f4a83a",currentFte:25,targetFte:28},
        {type:"org-unit",label:"Tribe: Platform",x:190,y:110,w:140,h:48,color:"#f4a83a",currentFte:20,targetFte:25},
        {type:"org-unit",label:"Tribe: Content",x:350,y:110,w:140,h:48,color:"#f4a83a",currentFte:18,targetFte:22},
        {type:"shared-service",label:"Platform Eng",x:60,y:206,w:140,h:48,color:"var(--sage)",currentFte:12,targetFte:15},
        {type:"shared-service",label:"SRE / DevOps",x:220,y:206,w:140,h:48,color:"var(--sage)",currentFte:8,targetFte:10},
        {type:"shared-service",label:"Data Infra",x:380,y:206,w:120,h:48,color:"var(--sage)",currentFte:6,targetFte:10},
        {type:"ai-node",label:"ML Platform",x:140,y:294,w:130,h:44,color:"#f4a83a",currentFte:4,targetFte:12,aiMaturity:"Scaling"},
        {type:"ai-node",label:"AI Features",x:300,y:294,w:130,h:44,color:"#f4a83a",currentFte:3,targetFte:8,aiMaturity:"Piloting"},
      ],
    },
    { label: "Netflix Tech OM", desc: "Full freedom & responsibility. Minimal hierarchy, strong platform.", industry: "Technology", company: "netflix",
      layers: [{label:"Leadership",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"Product Teams",y:98,height:90,color:"rgba(74,130,196,0.07)"},{label:"Platform",y:200,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"VP Eng",x:200,y:28,w:130,h:44,color:"#f4a83a",currentFte:3,targetFte:3},
        {type:"org-unit",label:"Studio Tech",x:30,y:116,w:140,h:48,color:"#f4a83a",currentFte:60,targetFte:65},
        {type:"org-unit",label:"Streaming",x:190,y:116,w:130,h:48,color:"#f4a83a",currentFte:45,targetFte:50},
        {type:"org-unit",label:"Data & ML",x:340,y:116,w:130,h:48,color:"#f4a83a",currentFte:35,targetFte:45},
        {type:"shared-service",label:"Core Platform",x:100,y:216,w:150,h:48,color:"var(--sage)",currentFte:30,targetFte:35},
        {type:"ai-node",label:"Personalization AI",x:280,y:216,w:160,h:48,color:"#f4a83a",currentFte:15,targetFte:25,aiMaturity:"Optimizing"},
      ],
    },
  ],
  "Risk & Compliance": [
    { label: "Three Lines Model", desc: "Industry standard for financial services — business ownership, risk oversight, independent audit.", industry: "Financial Services", company: "jpmorgan",
      layers: [{label:"Board / Risk Committee",y:16,height:60,color:"rgba(244,168,58,0.07)"},{label:"1st Line — Business",y:88,height:80,color:"rgba(74,130,196,0.07)"},{label:"2nd Line — Risk & Compliance",y:180,height:80,color:"rgba(167,139,184,0.07)"},{label:"3rd Line — Internal Audit",y:272,height:70,color:"rgba(167,139,184,0.07)"}],
      nodes: [
        {type:"governance",label:"CRO / Board",x:180,y:24,w:148,h:40,color:"#f4a83a",currentFte:2,targetFte:2},
        {type:"org-unit",label:"Business Risk Owners",x:40,y:104,w:170,h:48,color:"#f4a83a",currentFte:20,targetFte:18},
        {type:"org-unit",label:"Operational Risk",x:240,y:104,w:150,h:48,color:"#f4a83a",currentFte:12,targetFte:10},
        {type:"org-unit",label:"ERM",x:60,y:196,w:120,h:48,color:"var(--coral)",currentFte:8,targetFte:7},
        {type:"org-unit",label:"Compliance",x:200,y:196,w:120,h:48,color:"var(--coral)",currentFte:15,targetFte:12},
        {type:"org-unit",label:"Model Risk",x:340,y:196,w:120,h:48,color:"var(--coral)",currentFte:6,targetFte:5},
        {type:"governance",label:"Internal Audit",x:160,y:284,w:148,h:44,color:"var(--purple)",currentFte:10,targetFte:9},
        {type:"ai-node",label:"AI Surveillance",x:340,y:284,w:148,h:44,color:"#f4a83a",currentFte:0,targetFte:5,aiMaturity:"Piloting"},
      ],
    },
  ],
  "Clinical Operations": [
    { label: "Clinical OM", desc: "Hospital system operating model — clinical, administrative, revenue cycle.", industry: "Healthcare",
      layers: [{label:"CMO / CNO Office",y:16,height:70,color:"rgba(244,168,58,0.07)"},{label:"Clinical Departments",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Clinical Support",y:190,height:80,color:"rgba(74,158,107,0.07)"},{label:"Revenue Cycle",y:282,height:70,color:"rgba(167,139,184,0.07)"}],
      nodes: [
        {type:"governance",label:"CMO / CNO",x:180,y:28,w:148,h:44,color:"#f4a83a",currentFte:2,targetFte:2},
        {type:"org-unit",label:"Medicine",x:30,y:110,w:120,h:48,color:"#f4a83a",currentFte:80,targetFte:80},
        {type:"org-unit",label:"Surgery",x:170,y:110,w:110,h:48,color:"#f4a83a",currentFte:60,targetFte:58},
        {type:"org-unit",label:"Emergency",x:300,y:110,w:120,h:48,color:"#f4a83a",currentFte:45,targetFte:45},
        {type:"org-unit",label:"Pharmacy",x:440,y:110,w:110,h:48,color:"#f4a83a",currentFte:20,targetFte:18},
        {type:"shared-service",label:"Health IT / EHR",x:60,y:206,w:150,h:48,color:"var(--sage)",currentFte:15,targetFte:18},
        {type:"shared-service",label:"Quality & Safety",x:240,y:206,w:148,h:48,color:"var(--sage)",currentFte:10,targetFte:8},
        {type:"shared-service",label:"Coding & Billing",x:100,y:294,w:148,h:48,color:"var(--coral)",currentFte:25,targetFte:15},
        {type:"ai-node",label:"AI Clinical Decision",x:280,y:294,w:170,h:44,color:"#f4a83a",currentFte:0,targetFte:4,aiMaturity:"Exploring"},
      ],
    },
  ],
};

// Company → which function presets apply
export const OM_COMPANY_FUNCTIONS: Record<string, string[]> = {
  toyota:    ["HR","Finance","IT","Supply Chain","Legal"],
  tesla:     ["HR","Finance","IT","Technology (Product)","Supply Chain"],
  netflix:   ["HR","Finance","IT","Technology (Product)"],
  amazon:    ["HR","Finance","IT","Technology (Product)","Supply Chain"],
  jpmorgan:  ["HR","Finance","IT","Risk & Compliance","Legal"],
  spotify:   ["HR","Finance","IT","Technology (Product)"],
  microsoft: ["HR","Finance","IT","Technology (Product)","Legal"],
};

export const OM_ARCHETYPES_2: Record<string,{label:string;desc:string;layers:Omit<OMLayer2,"id">[];nodes:Omit<OMNode2,"id">[]}> = {
  federated: {
    label:"Federated",desc:"CoE guidance + BU autonomy",
    layers:[
      {label:"Executive",           y:16, height:90,  color:"rgba(244,168,58,0.07)"},
      {label:"Centres of Excellence",y:122,height:90,  color:"rgba(74,130,196,0.07)"},
      {label:"Business Units",       y:228,height:90,  color:"rgba(74,158,107,0.07)"},
      {label:"Shared Services",      y:334,height:90,  color:"rgba(167,139,184,0.07)"},
    ],
    nodes:[
      {type:"org-unit",label:"CHRO",         x:90,  y:38,  w:130,h:48,color:"#f4a83a",currentFte:1, targetFte:1},
      {type:"org-unit",label:"CDO",          x:270, y:38,  w:130,h:48,color:"#f4a83a",currentFte:1, targetFte:1},
      {type:"coe",     label:"AI CoE",       x:90,  y:143, w:130,h:48,color:"#f4a83a",currentFte:0, targetFte:8},
      {type:"coe",     label:"People Analytics",x:268,y:143,w:148,h:48,color:"#f4a83a",currentFte:2, targetFte:5},
      {type:"org-unit",label:"BU HR BP",     x:68,  y:249, w:130,h:48,color:"#f4a83a",currentFte:5, targetFte:3},
      {type:"org-unit",label:"BU HR BP",     x:248, y:249, w:130,h:48,color:"#f4a83a",currentFte:5, targetFte:3},
      {type:"shared-service",label:"Ops & Admin",x:68,y:355,w:138,h:48,color:"var(--sage)",currentFte:18,targetFte:12},
      {type:"shared-service",label:"Tech & Data", x:252,y:355,w:138,h:48,color:"var(--sage)",currentFte:8, targetFte:8},
    ],
  },
  centralized: {
    label:"Centralized",desc:"Central command model",
    layers:[
      {label:"Leadership",         y:16, height:90,  color:"rgba(244,168,58,0.07)"},
      {label:"Central Functions",  y:122,height:90,  color:"rgba(74,130,196,0.07)"},
      {label:"Delivery",           y:228,height:90,  color:"rgba(74,158,107,0.07)"},
    ],
    nodes:[
      {type:"org-unit",     label:"CPO / CHRO",    x:188,y:38,  w:158,h:48,color:"#f4a83a",currentFte:1,targetFte:1},
      {type:"coe",          label:"AI & Analytics", x:82, y:143, w:148,h:48,color:"#f4a83a",currentFte:3,targetFte:8},
      {type:"coe",          label:"Talent CoE",     x:278,y:143, w:138,h:48,color:"#f4a83a",currentFte:14,targetFte:10},
      {type:"shared-service",label:"GBS Delivery",  x:148,y:249, w:148,h:48,color:"var(--sage)",currentFte:28,targetFte:20},
    ],
  },
  "hub-spoke": {
    label:"Hub & Spoke",desc:"Global hub + regional spokes",
    layers:[
      {label:"Global Hub",    y:16, height:90,  color:"rgba(244,168,58,0.07)"},
      {label:"Regional Hubs", y:122,height:90,  color:"rgba(167,139,184,0.07)"},
      {label:"Local Spokes",  y:228,height:90,  color:"rgba(74,158,107,0.07)"},
      {label:"Enablement",    y:334,height:90,  color:"rgba(167,139,184,0.07)"},
    ],
    nodes:[
      {type:"org-unit",label:"Global HR Hub", x:194,y:38,  w:170,h:48,color:"#f4a83a",currentFte:5,targetFte:5},
      {type:"org-unit",label:"Americas Hub",  x:52, y:143, w:138,h:48,color:"var(--coral)",currentFte:10,targetFte:8},
      {type:"org-unit",label:"EMEA Hub",      x:234,y:143, w:138,h:48,color:"var(--coral)",currentFte:10,targetFte:8},
      {type:"org-unit",label:"APAC Hub",      x:416,y:143, w:138,h:48,color:"var(--coral)",currentFte:10,targetFte:8},
      {type:"ai-node", label:"AI Platform",   x:234,y:355, w:138,h:48,color:"#f4a83a",currentFte:0, targetFte:6,aiMaturity:"Scaling"},
    ],
  },
};


export function omUid() { return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`; }
export function omSnap(v: number) { return Math.round(v / 8) * 8; }

// ── Node renderer ─────────────────────────────────────────────────────────────

export function OMNodeEl({ n, selected, mode, onDown, onEnter, onLeave, kpis }: {
  n: OMNode2; selected: boolean; mode: OMDesignMode2;
  onDown:(e:React.MouseEvent)=>void; onEnter:()=>void; onLeave:()=>void;
  kpis: OMKpi2[];
}) {
  const delta  = (n.targetFte??0)-(n.currentFte??0);
  const hasKpi = (n.kpiIds??[]).some(id=>kpis.find(k=>k.id===id));
  const isAi   = n.type==="ai-node";

  return (
    <g transform={`translate(${n.x},${n.y})`} onMouseDown={onDown} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{cursor:"grab",userSelect:"none"}}>
      {selected && <rect x={-5} y={-5} width={n.w+10} height={n.h+10} rx={10} fill="none" stroke="#f4a83a" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />}
      {isAi ? (
        (() => {
          const cx=n.w/2,cy=n.h/2,r=Math.min(cx,cy)-5;
          const pts=Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/6;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" ");
          return <polygon points={pts} fill={`${n.color}20`} stroke={selected?"#f4a83a":n.color} strokeWidth={selected?2:1.5} />;
        })()
      ) : n.type==="governance" ? (
        <polygon points={`${n.w/2},4 ${n.w-4},${n.h/2} ${n.w/2},${n.h-4} 4,${n.h/2}`} fill={`${n.color}20`} stroke={selected?"#f4a83a":n.color} strokeWidth={selected?2:1.5} />
      ) : n.type==="role" ? (
        <ellipse cx={n.w/2} cy={n.h/2} rx={n.w/2-3} ry={n.h/2-3} fill={`${n.color}20`} stroke={selected?"#f4a83a":n.color} strokeWidth={selected?2:1.5} />
      ) : (
        <rect x={2} y={2} width={n.w-4} height={n.h-4} rx={6} fill={`${n.color}20`} stroke={selected?"#f4a83a":n.color} strokeWidth={selected?2:1.5} />
      )}

      {/* Wave badge */}
      {(n.wave??0)>0 && <>
        <rect x={5} y={4} width={18} height={13} rx={3} fill={OM_WAVE_COLOR[n.wave!]} />
        <text x={14} y={13} textAnchor="middle" fontSize={7} fontWeight={800} fill="var(--ink)" fontFamily="monospace" style={{pointerEvents:"none"}}>W{n.wave}</text>
      </>}

      {/* KPI dot */}
      {hasKpi && <circle cx={n.w-7} cy={7} r={5} fill="var(--sage)" opacity={0.9} />}

      {/* Label */}
      <text x={n.w/2} y={n.h/2-(n.currentFte!=null?5:0)} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight={600} fill="var(--ink)" fontFamily="'Inter Tight',sans-serif" style={{pointerEvents:"none"}}>
        {n.label.length>18?n.label.slice(0,17)+"…":n.label}
      </text>

      {/* FTE line */}
      {n.currentFte!=null && (
        <text x={n.w-5} y={n.h-5} textAnchor="end" fontSize={9}
          fill={mode==="target"?(delta<0?"var(--coral)":delta>0?"var(--sage)":"var(--ink-whisper)"):"#f4a83a"}
          fontFamily="monospace" style={{pointerEvents:"none"}}>
          {mode==="target"?`${n.targetFte??0} FTE${delta!==0?` (${delta>0?"+":""}${delta})`:""}`:
                           `${n.currentFte} FTE`}
        </text>
      )}

      {/* AI maturity */}
      {n.aiMaturity && <text x={6} y={n.h-5} fontSize={8} fill="#f4a83a" fontFamily="monospace" style={{pointerEvents:"none"}}>⬡ {n.aiMaturity}</text>}
    </g>
  );
}

// ── Edge renderer ──────────────────────────────────────────────────────────────

export function OMEdgeEl({ e, nodes, selected, onSelect }: { e:OMEdge2; nodes:OMNode2[]; selected:boolean; onSelect:()=>void; }) {
  const from=nodes.find(n=>n.id===e.fromId);
  const to  =nodes.find(n=>n.id===e.toId);
  if (!from||!to) return null;
  const x1=from.x+from.w/2, y1=from.y+from.h;
  const x2=to.x+to.w/2,    y2=to.y;
  const my=(y1+y2)/2;
  const {dash,color}=OM_EDGE_CFG[e.type];
  return (
    <g onClick={ev=>{ev.stopPropagation();onSelect();}}>
      <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke="transparent" strokeWidth={12} style={{cursor:"pointer"}} />
      <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke={selected?"#f4a83a":color} strokeWidth={selected?2:1.5} strokeDasharray={dash} markerEnd={`url(#omarr2-${e.type})`} opacity={0.75} />
    </g>
  );
}

// ── Properties Panel ──────────────────────────────────────────────────────────

export function OMProps({ n, kpis, onChange, onDelete, onClose }: {
  n:OMNode2; kpis:OMKpi2[];
  onChange:(u:Partial<OMNode2>)=>void; onDelete:()=>void; onClose:()=>void;
}) {
  const IS: React.CSSProperties = {background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",borderRadius:5,color:"var(--ink)",padding:"5px 8px",fontSize: 15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Inter Tight',sans-serif"};
  const LB: React.CSSProperties = {fontSize: 14,fontWeight:800,color:"var(--ink-whisper)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3,display:"block"};
  return (
    <div style={{position:"absolute",top:0,right:0,width:248,height:"100%",background:"var(--paper-solid)",borderLeft:"1px solid var(--paper-solid)",display:"flex",flexDirection:"column",zIndex:25,fontFamily:"'Inter Tight',sans-serif",boxShadow:"-4px 0 20px rgba(0,0,0,0.35)"}}>
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--paper-solid)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize: 14,fontWeight:800,color:"#f4a83a",letterSpacing:"0.12em",textTransform:"uppercase"}}>Properties</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"var(--ink-whisper)",cursor:"pointer",fontSize:17,padding:0,lineHeight:1}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:9}}>
        <div><label style={LB}>Label</label><input value={n.label} onChange={e=>onChange({label:e.target.value})} style={IS} /></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          <div><label style={LB}>FTE (Now)</label><input type="number" min={0} value={n.currentFte??""} onChange={e=>onChange({currentFte:Number(e.target.value)||undefined})} style={IS} /></div>
          <div><label style={LB}>FTE (Target)</label><input type="number" min={0} value={n.targetFte??""} onChange={e=>onChange({targetFte:Number(e.target.value)||undefined})} style={IS} /></div>
        </div>
        <div><label style={LB}>Type</label>
          <select value={n.type} onChange={e=>onChange({type:e.target.value as OMNodeType2,color:OM_NODE_CFG[e.target.value as OMNodeType2].color})} style={IS}>
            {(Object.entries(OM_NODE_CFG) as [OMNodeType2,{icon:string;color:string}][]).map(([k,v])=><option key={k} value={k}>{v.icon} {k}</option>)}
          </select>
        </div>
        <div><label style={LB}>Color</label>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {["#f4a83a","#f4a83a","var(--sage)","#f4a83a","var(--coral)","var(--purple)","var(--coral)","var(--teal)"].map(c=>(
              <button key={c} onClick={()=>onChange({color:c})} style={{width:20,height:20,borderRadius:4,background:c,border:"none",cursor:"pointer",outline:n.color===c?"2px solid var(--warning)":"none",outlineOffset:2}} />
            ))}
          </div>
        </div>
        <div><label style={LB}>Wave</label>
          <select value={n.wave??0} onChange={e=>onChange({wave:Number(e.target.value)})} style={IS}>
            <option value={0}>Unassigned</option>
            {[1,2,3,4].map(w=><option key={w} value={w}>Wave {w}</option>)}
          </select>
        </div>
        <div><label style={LB}>AI Maturity</label>
          <select value={n.aiMaturity??""} onChange={e=>onChange({aiMaturity:e.target.value||undefined})} style={IS}>
            <option value="">—</option>
            {["Exploring","Piloting","Scaling","Optimizing"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {kpis.length>0&&<div><label style={LB}>Linked KPIs</label>
          {kpis.map(k=>{const linked=(n.kpiIds??[]).includes(k.id);return (
            <label key={k.id} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",marginBottom:4,fontSize: 15,color:linked?"var(--sage)":"var(--ink-whisper)"}}>
              <input type="checkbox" checked={linked} style={{accentColor:"var(--sage)",width:11,height:11}}
                onChange={()=>{const ids=n.kpiIds??[];onChange({kpiIds:linked?ids.filter(x=>x!==k.id):[...ids,k.id]});}} />
              {k.name.length>26?k.name.slice(0,25)+"…":k.name}
            </label>
          );})}
        </div>}
        <div><label style={LB}>Width</label>
          <input type="range" min={80} max={280} value={n.w} onChange={e=>onChange({w:Number(e.target.value)})} style={{width:"100%",accentColor:"#f4a83a"}} />
        </div>
        <div><label style={LB}>Notes</label><textarea value={n.notes??""} onChange={e=>onChange({notes:e.target.value})} rows={3} style={{...IS,resize:"vertical",minHeight:56}} /></div>
      </div>
      <div style={{padding:10,borderTop:"1px solid var(--paper-solid)"}}>
        <button onClick={onDelete} style={{width:"100%",padding:"6px 0",borderRadius:5,background:"rgba(224,108,117,0.12)",border:"1px solid rgba(224,108,117,0.3)",color:"var(--coral)",fontSize: 15,fontWeight:700,cursor:"pointer",fontFamily:"'Inter Tight',sans-serif"}}>Delete Node</button>
      </div>
    </div>
  );
}

// ── Main Canvas Component ──────────────────────────────────────────────────────

export function OMDesignCanvas({ projectId, onBack, onNavigateLab }: { projectId: string; onBack: ()=>void; onNavigateLab?: ()=>void }) {
  const [nodes,    setNodes]    = usePersisted<OMNode2[]>(`${projectId}_om_nodes`, []);
  const [edges,    setEdges]    = usePersisted<OMEdge2[]>(`${projectId}_om_edges`, []);
  const [layers,   setLayers]   = usePersisted<OMLayer2[]>(`${projectId}_om_layers`, []);
  const [versions, setVersions] = usePersisted<OMVersion2[]>(`${projectId}_om_versions`, []);
  const [kpis]                  = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [canvasFunc, setCanvasFunc] = useState<string>("HR");
  const [showDict,   setShowDict]   = useState(false);
  const [dictFilter, setDictFilter] = useState("");

  const [selId,     setSelId]     = useState<string|null>(null);
  const [selEdge,   setSelEdge]   = useState<string|null>(null);
  const [multiSel,  setMultiSel]  = useState<string[]>([]);
  const [hovered,   setHovered]   = useState<string|null>(null);
  const [mode,      setMode]      = useState<OMDesignMode2>("target");
  const [edgeMode,  setEdgeMode]  = useState<OMEdgeType2|null>(null);
  const [edgeStart, setEdgeStart] = useState<string|null>(null);
  const [zoom,      setZoom]      = useState(1);
  const [pan,       setPan]       = useState({x:24,y:24});
  const [isPanning, setIsPanning] = useState(false);
  const [panStart,  setPanStart]  = useState({x:0,y:0});
  const [snapOn,    setSnapOn]    = useState(true);
  const [showLayers,setShowLayers]= useState(false);
  const [showVers,  setShowVers]  = useState(false);
  const [vName,     setVName]     = useState("");
  const [saved,     setSaved]     = useState(false);
  const [activeArch,setActiveArch]= useState<string|null>(null);
  const [dragState, setDragState] = useState<{ids:string[];offsets:{id:string;ox:number;oy:number}[]}|null>(null);
  const svgRef  = useRef<SVGSVGElement>(null);
  const contRef = useRef<HTMLDivElement>(null);

  const selNode = nodes.find(n=>n.id===selId);
  const totCur  = nodes.reduce((s,n)=>s+(n.currentFte??0),0);
  const totTgt  = nodes.reduce((s,n)=>s+(n.targetFte??0),0);

  // Keyboard shortcuts
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==="Escape"){setEdgeMode(null);setEdgeStart(null);setSelId(null);setMultiSel([]);}
      if((e.key==="Delete"||e.key==="Backspace")&&selId&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){
        setNodes(prev=>prev.filter(n=>n.id!==selId));
        setEdges(prev=>prev.filter(ed=>ed.fromId!==selId&&ed.toId!==selId));
        setSelId(null);
      }
    };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  },[selId,setNodes,setEdges]);

  const loadArch = (key:string)=>{
    const a=OM_ARCHETYPES_2[key]; if(!a) return;
    const ns=a.nodes.map(n=>({...n,id:omUid()}));
    const ls=a.layers.map(l=>({...l,id:omUid()}));
    setNodes(ns); setEdges([]); setLayers(ls); setSelId(null); setMultiSel([]); setActiveArch(key);
  };

  const loadPreset = (preset: OMPreset) => {
    const ns = preset.nodes.map(n => ({...n, id: omUid()}));
    const ls = preset.layers.map(l => ({...l, id: omUid()}));
    setNodes(ns); setEdges([]); setLayers(ls); setSelId(null); setMultiSel([]); setActiveArch(null); setShowDict(false);
  };

  // Get presets for current function
  const funcPresets = OM_FUNCTION_PRESETS[canvasFunc] || [];
  // Get all presets matching a filter
  const allPresets = Object.entries(OM_FUNCTION_PRESETS).flatMap(([func, presets]) => presets.map(p => ({...p, _func: func})));
  const filteredDict = dictFilter ? allPresets.filter(p => `${p.label} ${p.desc} ${p.industry||""} ${p.company||""} ${p._func}`.toLowerCase().includes(dictFilter.toLowerCase())) : allPresets;

  const addNode=(type:OMNodeType2)=>{
    const cfg=OM_NODE_CFG[type];
    const n:OMNode2={id:omUid(),type,label:type.replace("-"," "),x:omSnap(80+Math.random()*160),y:omSnap(60+Math.random()*160),w:cfg.defaultW,h:cfg.defaultH,color:cfg.color};
    setNodes(prev=>[...prev,n]); setSelId(n.id);
  };

  const updateNode=(id:string,u:Partial<OMNode2>)=>setNodes(prev=>prev.map(n=>n.id===id?{...n,...u}:n));
  const deleteNode=(id:string)=>{setNodes(prev=>prev.filter(n=>n.id!==id));setEdges(prev=>prev.filter(e=>e.fromId!==id&&e.toId!==id));setSelId(null);};

  const onNodeDown=useCallback((e:React.MouseEvent,id:string)=>{
    e.stopPropagation();
    if(edgeMode){
      if(!edgeStart){setEdgeStart(id);return;}
      if(edgeStart!==id){setEdges(prev=>[...prev,{id:omUid(),fromId:edgeStart,toId:id,type:edgeMode}]);setEdgeStart(null);setEdgeMode(null);}
      return;
    }
    setSelEdge(null);
    if(e.shiftKey||e.metaKey||e.ctrlKey){setMultiSel(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);return;}
    setSelId(id); setMultiSel([]);
    const activeIds=[id];
    if(!svgRef.current) return;
    const rect=svgRef.current.getBoundingClientRect();
    const offs=activeIds.map(nid=>{const nn=nodes.find(x=>x.id===nid)!;return {id:nid,ox:(e.clientX-rect.left)/zoom-pan.x/zoom-nn.x,oy:(e.clientY-rect.top)/zoom-pan.y/zoom-nn.y};});
    setDragState({ids:activeIds,offsets:offs});
  },[edgeMode,edgeStart,nodes,zoom,pan,setEdges]);

  const onSvgMove=useCallback((e:React.MouseEvent)=>{
    if(dragState&&svgRef.current){
      const rect=svgRef.current.getBoundingClientRect();
      const mx=(e.clientX-rect.left)/zoom-pan.x/zoom;
      const my=(e.clientY-rect.top)/zoom-pan.y/zoom;
      setNodes(prev=>prev.map(n=>{
        const o=dragState.offsets.find(x=>x.id===n.id); if(!o) return n;
        const nx=mx-o.ox, ny=my-o.oy;
        return {...n,x:snapOn?omSnap(nx):nx,y:snapOn?omSnap(ny):ny};
      }));
    }
    if(isPanning) setPan({x:panStart.x+e.clientX,y:panStart.y+e.clientY});
  },[dragState,isPanning,panStart,zoom,pan,snapOn,setNodes]);

  const onSvgUp=()=>{setDragState(null);setIsPanning(false);};
  const onSvgDown=(e:React.MouseEvent)=>{
    if(e.button===1||e.altKey){setIsPanning(true);setPanStart({x:pan.x-e.clientX,y:pan.y-e.clientY});}
    else{setSelId(null);setSelEdge(null);if(!e.shiftKey&&!e.metaKey)setMultiSel([]);}
  };
  const onWheel=(e:React.WheelEvent)=>{e.preventDefault();setZoom(z=>Math.min(2.5,Math.max(0.25,z-e.deltaY*0.001)));};

  const fitView=()=>{
    if(!nodes.length||!contRef.current) return;
    const xs=nodes.flatMap(n=>[n.x,n.x+n.w]); const ys=nodes.flatMap(n=>[n.y,n.y+n.h]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const pw=maxX-minX+80,ph=maxY-minY+80;
    const cw=contRef.current.offsetWidth,ch=contRef.current.offsetHeight;
    const nz=Math.min(2,Math.max(0.3,Math.min(cw/pw,ch/ph)*0.85));
    setZoom(nz); setPan({x:cw/2-(minX+pw/2)*nz,y:ch/2-(minY+ph/2)*nz});
  };

  const saveVersion=()=>{
    if(!vName.trim()) return;
    setVersions(prev=>[...prev,{id:omUid(),name:vName.trim(),ts:new Date().toISOString(),nodes,edges,layers}]);
    setVName(""); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const exportSVG=()=>{
    if(!svgRef.current) return;
    const blob=new Blob([new XMLSerializer().serializeToString(svgRef.current)],{type:"image/svg+xml"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="operating-model.svg"; a.click();
  };

  const IB=(extra?:React.CSSProperties):React.CSSProperties=>({background:"none",border:"1px solid var(--paper-solid)",borderRadius:4,color:"#c9bfa8",cursor:"pointer",fontSize: 15,padding:"3px 8px",fontFamily:"'Inter Tight',sans-serif",...extra});
  const delta=totTgt-totCur;

  return (
    <div style={{height:"calc(100vh - 96px)",display:"flex",flexDirection:"column",background:"var(--paper-solid)",fontFamily:"'Inter Tight',sans-serif",color:"var(--ink)",borderRadius:12,overflow:"hidden",border:"1px solid var(--paper-solid)"}}>
      {/* Header */}
      <div style={{padding:"7px 12px",borderBottom:"1px solid var(--paper-solid)",display:"flex",alignItems:"center",gap:8,background:"var(--paper-solid)",flexShrink:0,flexWrap:"wrap"}}>
        <span style={{fontSize: 15,fontWeight:800,color:"#f4a83a",letterSpacing:"0.04em",marginRight:4}}>OM CANVAS</span>
        {onNavigateLab && <button onClick={onNavigateLab} style={{padding:"2px 9px",borderRadius:4,fontSize: 14,fontWeight:700,background:"transparent",border:"1px solid var(--paper-solid)",color:"var(--ink-whisper)",cursor:"pointer",marginRight:4}} title="Switch to Analysis Lab">🧬 Lab</button>}
        <div style={{display:"flex",background:"var(--paper-solid)",borderRadius:6,padding:2,border:"1px solid var(--paper-solid)"}}>
          {(["current","target"] as OMDesignMode2[]).map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:"2px 9px",borderRadius:4,fontSize: 15,fontWeight:700,background:mode===m?(m==="current"?"#f4a83a":"#f4a83a"):"transparent",border:"none",color:mode===m?"var(--ink)":"var(--ink-whisper)",cursor:"pointer"}}>
              {m==="current"?"Current":"Target"}
            </button>
          ))}
        </div>
        <div style={{width:1,height:14,background:"var(--paper-solid)"}} />
        {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
          <button key={k} onClick={()=>{setEdgeMode(edgeMode===k?null:k);setEdgeStart(null);}}
            style={{...IB(),padding:"2px 7px",fontSize: 14,border:`1px solid ${edgeMode===k?v.color:"var(--paper-solid)"}`,background:edgeMode===k?`${v.color}22`:"transparent",color:edgeMode===k?v.color:"var(--ink-whisper)"}}>
            {v.label}
          </button>
        ))}
        <div style={{flex:1}} />
        <button onClick={()=>setZoom(z=>Math.min(2.5,z+0.1))} style={IB()}>+</button>
        <span style={{fontSize: 15,fontFamily:"monospace",color:"var(--ink-whisper)",minWidth:30,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={fitView} style={IB()} title="Fit to screen">⌂</button>
        <button onClick={()=>setZoom(z=>Math.max(0.25,z-0.1))} style={IB()}>−</button>
        <button onClick={()=>setSnapOn(s=>!s)} style={IB({color:snapOn?"#f4a83a":"var(--ink-whisper)",border:`1px solid ${snapOn?"#f4a83a":"var(--paper-solid)"}`})} title="Snap to grid">⊞</button>
        <div style={{width:1,height:14,background:"var(--paper-solid)"}} />
        <button onClick={exportSVG} style={IB()}>↓ SVG</button>
        <button onClick={()=>{setShowVers(v=>!v);setShowLayers(false);}} style={IB({color:showVers?"#f4a83a":"#c9bfa8"})}>◷</button>
        <button onClick={()=>{setNodes(nodes);setEdges(edges);setLayers(layers);setSaved(true);setTimeout(()=>setSaved(false),2000);}}
          style={{padding:"4px 12px",borderRadius:5,fontSize: 15,fontWeight:700,background:saved?"var(--sage)":"#f4a83a",border:"none",color:"var(--ink)",cursor:"pointer",transition:"background 0.3s"}}>
          {saved?"✓":"Save"}
        </button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>
        {/* Left palette */}
        <div style={{width:180,flexShrink:0,background:"var(--paper-solid)",borderRight:"1px solid var(--paper-solid)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
          {/* Function Scope Selector */}
          <OMPalSec label="Function Scope">
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {Object.keys(OM_FUNCTION_PRESETS).map(f=>(
                <button key={f} onClick={()=>setCanvasFunc(f)} style={{padding:"2px 7px",borderRadius:4,fontSize: 15,fontWeight:700,background:canvasFunc===f?"rgba(244,168,58,0.2)":"transparent",border:`1px solid ${canvasFunc===f?"#f4a83a":"var(--paper-solid)"}`,color:canvasFunc===f?"#f4a83a":"var(--ink-whisper)",cursor:"pointer"}}>{f}</button>
              ))}
            </div>
          </OMPalSec>
          <div style={{height:1,background:"var(--paper-solid)",margin:"2px 0"}} />

          {/* Function-specific presets */}
          <OMPalSec label={`${canvasFunc} Models`}>
            {funcPresets.length > 0 ? funcPresets.map((p,i)=>(
              <OMPalBtn key={i} onClick={()=>loadPreset(p)}>
                <div style={{fontSize: 15,fontWeight:700,color:"var(--ink)"}}>{p.label}</div>
                <div style={{fontSize: 15,color:"var(--ink-whisper)",marginTop:1}}>{p.industry||"General"}</div>
              </OMPalBtn>
            )) : <div style={{fontSize: 14,color:"var(--ink-whisper)",padding:"4px 8px"}}>No presets for {canvasFunc}</div>}
          </OMPalSec>
          <div style={{height:1,background:"var(--paper-solid)",margin:"2px 0"}} />

          {/* OM Dictionary button */}
          <OMPalSec label="Dictionary">
            <OMPalBtn onClick={()=>setShowDict(d=>!d)}>
              <span style={{color:"#f4a83a",marginRight:6,fontSize: 15}}>📖</span>
              <span style={{fontSize: 15,fontWeight:700}}>{showDict?"Close":"Browse All Models"}</span>
            </OMPalBtn>
          </OMPalSec>
          <div style={{height:1,background:"var(--paper-solid)",margin:"2px 0"}} />

          <OMPalSec label="Start from">
            {Object.entries(OM_ARCHETYPES_2).map(([k,v])=>(
              <OMPalBtn key={k} active={activeArch===k} onClick={()=>loadArch(k)}>
                <div style={{fontSize: 15,fontWeight:700}}>{v.label}</div>
                <div style={{fontSize: 14,color:"var(--ink-whisper)",marginTop:1}}>{v.desc}</div>
              </OMPalBtn>
            ))}
          </OMPalSec>
          <div style={{height:1,background:"var(--paper-solid)",margin:"2px 0"}} />
          <OMPalSec label="Add Node">
            {(Object.entries(OM_NODE_CFG) as [OMNodeType2,{icon:string;color:string}][]).map(([k,v])=>(
              <OMPalBtn key={k} onClick={()=>addNode(k)}>
                <span style={{color:v.color,marginRight:6,fontSize: 15}}>{v.icon}</span>
                <span style={{fontSize: 15}}>{k.replace("-"," ")}</span>
              </OMPalBtn>
            ))}
          </OMPalSec>
          <div style={{height:1,background:"var(--paper-solid)",margin:"2px 0"}} />
          <OMPalSec label="Layers">
            <OMPalBtn onClick={()=>{setShowLayers(l=>!l);setShowVers(false);}}>
              <span style={{color:"#f4a83a",marginRight:6}}>⊟</span>
              <span style={{fontSize: 15}}>Edit Layers</span>
            </OMPalBtn>
          </OMPalSec>
          <div style={{height:1,background:"var(--paper-solid)",margin:"2px 0"}} />
          <OMPalSec label="Legend">
            {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <svg width={24} height={8}><line x1={2} y1={4} x2={22} y2={4} stroke={v.color} strokeWidth={1.5} strokeDasharray={v.dash}/></svg>
                <span style={{fontSize: 14,color:"var(--ink-whisper)"}}>{v.label}</span>
              </div>
            ))}
          </OMPalSec>
          {edgeMode&&<div style={{margin:"6px 8px",padding:"7px 9px",borderRadius:5,background:"rgba(244,168,58,0.1)",border:"1px solid rgba(244,168,58,0.3)",fontSize: 14,color:"#f4a83a"}}>{edgeStart?"Click target":"Click source"}</div>}
        </div>

        {/* OM Dictionary Panel — slides over canvas */}
        {showDict && <div style={{width:320,flexShrink:0,background:"var(--paper-solid)",borderRight:"1px solid var(--paper-solid)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
          <div style={{padding:"10px 12px",borderBottom:"1px solid var(--paper-solid)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize: 15,fontWeight:800,color:"#f4a83a",letterSpacing:"0.03em"}}>📖 OM Dictionary</span>
            <button onClick={()=>setShowDict(false)} style={{background:"none",border:"none",color:"var(--ink-whisper)",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{padding:"6px 10px"}}>
            <input value={dictFilter} onChange={e=>setDictFilter(e.target.value)} placeholder="Search models, industries, companies..." style={{width:"100%",background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",borderRadius:5,padding:"5px 8px",fontSize: 15,color:"var(--ink)",outline:"none",fontFamily:"'Inter Tight',sans-serif",boxSizing:"border-box"}} />
          </div>
          <div style={{padding:"4px 10px",fontSize: 14,color:"var(--ink-whisper)"}}>{filteredDict.length} operating model patterns</div>
          <div style={{flex:1,overflowY:"auto",padding:"0 8px 8px"}}>
            {Object.entries(OM_FUNCTION_PRESETS).map(([func, presets])=>{
              const filtered = dictFilter ? presets.filter(p=>`${p.label} ${p.desc} ${p.industry||""} ${p.company||""} ${func}`.toLowerCase().includes(dictFilter.toLowerCase())) : presets;
              if(filtered.length===0) return null;
              return <div key={func}>
                <div style={{fontSize: 14,fontWeight:800,color:"#f4a83a",letterSpacing:"0.08em",textTransform:"uppercase",padding:"8px 0 4px",borderBottom:"1px solid var(--paper-solid)",marginBottom:4}}>{func}</div>
                {filtered.map((p,i)=>(
                  <div key={i} onClick={()=>loadPreset(p)} style={{padding:"8px 10px",marginBottom:4,borderRadius:6,background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#f4a83a";e.currentTarget.style.background="var(--paper-solid)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--paper-solid)";e.currentTarget.style.background="var(--paper-solid)";}}>
                    <div style={{fontSize: 15,fontWeight:700,color:"var(--ink)",marginBottom:2}}>{p.label}</div>
                    <div style={{fontSize: 14,color:"var(--ink-whisper)",lineHeight:1.4,marginBottom:4}}>{p.desc}</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {p.industry && <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(74,130,196,0.15)",color:"#f4a83a"}}>{p.industry}</span>}
                      {p.company && <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(244,168,58,0.15)",color:"#f4a83a"}}>{p.company}</span>}
                      <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(74,158,107,0.15)",color:"var(--sage)"}}>{p.nodes.length} nodes · {p.layers.length} layers</span>
                      {(() => { const delta = p.nodes.reduce((s,n)=>(n.targetFte??0)-(n.currentFte??0)+s,0); return delta !== 0 ? <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:delta<0?"rgba(224,108,117,0.15)":"rgba(74,158,107,0.15)",color:delta<0?"var(--coral)":"var(--sage)"}}>{delta>0?"+":""}{delta} FTE</span> : null; })()}
                    </div>
                  </div>
                ))}
              </div>;
            })}
          </div>
        </div>}

        {/* Canvas area */}
        <div ref={contRef} style={{flex:1,position:"relative",overflow:"hidden",background:"var(--paper-solid)"}} onWheel={onWheel}>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
            <defs><pattern id="omg2" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x%(8*zoom)},${pan.y%(8*zoom)}) scale(${zoom})`}><path d="M 8 0 L 0 0 0 8" fill="none" stroke="var(--paper-solid)" strokeWidth={0.4} opacity={0.6} /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#omg2)" />
          </svg>

          {!nodes.length&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,pointerEvents:"none"}}><div style={{fontSize:36,opacity:0.12}}>⬡</div><div style={{fontSize: 15,color:"var(--ink-whisper)"}}>Select an archetype or add nodes</div></div>}

          <svg ref={svgRef} style={{width:"100%",height:"100%",cursor:edgeMode?"crosshair":isPanning?"grabbing":"default"}}
            onMouseMove={onSvgMove} onMouseUp={onSvgUp} onMouseDown={onSvgDown}>
            <defs>
              {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
                <marker key={k} id={`omarr2-${k}`} markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
                  <path d="M0,0 L0,6 L7,3 z" fill={v.color} opacity={0.85} />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {layers.map(l=>(
                <g key={l.id}>
                  <rect x={0} y={l.y} width={900} height={l.height} fill={l.color} stroke="var(--paper-solid)" strokeWidth={0.5} rx={4} />
                  <text x={8} y={l.y+12} fontSize={8} fontWeight={800} fill="var(--ink-whisper)" fontFamily="monospace" letterSpacing="0.1em">{l.label.toUpperCase()}</text>
                </g>
              ))}
              {edges.map(e=><OMEdgeEl key={e.id} e={e} nodes={nodes} selected={selEdge===e.id} onSelect={()=>{setSelEdge(e.id);setSelId(null);}} />)}
              {multiSel.map(id=>{const n=nodes.find(x=>x.id===id);if(!n)return null;return <rect key={id} x={n.x-4} y={n.y-4} width={n.w+8} height={n.h+8} rx={8} fill="rgba(232,197,71,0.06)" stroke="#f4a83a" strokeWidth={1} strokeDasharray="3,2" />;}) }
              {nodes.map(n=><OMNodeEl key={n.id} n={n} selected={selId===n.id} mode={mode} kpis={kpis}
                onDown={e=>onNodeDown(e,n.id)} onEnter={()=>setHovered(n.id)} onLeave={()=>setHovered(null)} />)}
            </g>
          </svg>

          {/* Delta strip */}
          {nodes.length>0&&(
            <div style={{position:"absolute",bottom:10,left:172,display:"flex",gap:7}}>
              {[{k:"Current FTE",v:totCur,c:"#f4a83a"},{k:"Target FTE",v:totTgt,c:"#f4a83a"},{k:"Net Δ",v:delta>0?`+${delta}`:String(delta),c:delta<0?"var(--coral)":"var(--sage)"},{k:"Nodes",v:nodes.length,c:"#c9bfa8"}].map(({k,v,c})=>(
                <div key={k} style={{padding:"3px 9px",borderRadius:5,background:"var(--paper-solid)",border:"1px solid var(--paper-solid)"}}>
                  <div style={{fontSize: 15,color:"var(--ink-whisper)",textTransform:"uppercase",fontFamily:"monospace"}}>{k}</div>
                  <div style={{fontSize: 15,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Layer editor */}
          {showLayers&&(
            <div style={{position:"absolute",top:48,left:170,zIndex:30,background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",borderRadius:8,padding:14,width:240,boxShadow:"0 10px 28px rgba(0,0,0,0.45)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize: 14,fontWeight:800,color:"#f4a83a",letterSpacing:"0.1em",textTransform:"uppercase"}}>Edit Layers</span>
                <button onClick={()=>setShowLayers(false)} style={{background:"none",border:"none",color:"var(--ink-whisper)",cursor:"pointer",fontSize:16}}>×</button>
              </div>
              {layers.map((l,i)=>(
                <div key={l.id} style={{display:"flex",gap:5,marginBottom:5,alignItems:"center"}}>
                  <input value={l.label} onChange={e=>{const u=[...layers];u[i]={...l,label:e.target.value};setLayers(u);}} style={{flex:1,background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",borderRadius:4,color:"var(--ink)",padding:"4px 7px",fontSize: 15,outline:"none"}} />
                  <button onClick={()=>setLayers(layers.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"var(--coral)",cursor:"pointer",fontSize: 15}}>×</button>
                </div>
              ))}
              <button onClick={()=>{const lastY=layers.length?layers[layers.length-1].y+layers[layers.length-1].height+16:16;setLayers([...layers,{id:omUid(),label:"New Layer",y:lastY,height:90,color:"rgba(255,255,255,0.04)"}]);}}
                style={{width:"100%",marginTop:4,padding:"5px 0",background:"rgba(244,168,58,0.12)",border:"1px solid rgba(244,168,58,0.4)",borderRadius:5,color:"#f4a83a",fontSize: 15,fontWeight:700,cursor:"pointer",fontFamily:"'Inter Tight',sans-serif"}}>
                + Add Layer
              </button>
            </div>
          )}

          {/* Versions panel */}
          {showVers&&(
            <div style={{position:"absolute",top:0,right:selNode?248:0,width:240,height:"100%",background:"var(--paper-solid)",borderLeft:"1px solid var(--paper-solid)",display:"flex",flexDirection:"column",zIndex:24,boxShadow:"-4px 0 16px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"10px 12px",borderBottom:"1px solid var(--paper-solid)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize: 14,fontWeight:800,color:"#f4a83a",letterSpacing:"0.1em",textTransform:"uppercase"}}>Versions</span>
                <button onClick={()=>setShowVers(false)} style={{background:"none",border:"none",color:"var(--ink-whisper)",cursor:"pointer",fontSize:17}}>×</button>
              </div>
              <div style={{padding:"9px 10px",borderBottom:"1px solid var(--paper-solid)",background:"var(--paper-solid)"}}>
                <input value={vName} onChange={e=>setVName(e.target.value)} placeholder='Snapshot name…' style={{width:"100%",background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",borderRadius:4,color:"var(--ink)",padding:"4px 7px",fontSize: 15,outline:"none",boxSizing:"border-box",marginBottom:5}} />
                <button onClick={saveVersion} disabled={!vName.trim()} style={{width:"100%",padding:"5px 0",borderRadius:4,background:vName.trim()?"rgba(244,168,58,0.15)":"transparent",border:`1px solid ${vName.trim()?"rgba(244,168,58,0.5)":"var(--paper-solid)"}`,color:vName.trim()?"#f4a83a":"var(--ink-whisper)",fontSize: 15,fontWeight:700,cursor:vName.trim()?"pointer":"default",fontFamily:"'Inter Tight',sans-serif"}}>Save Snapshot</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:8}}>
                {versions.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"var(--ink-whisper)",fontSize: 15}}>No snapshots yet</div>}
                {[...versions].reverse().map(v=>(
                  <div key={v.id} style={{padding:"9px 10px",borderRadius:6,marginBottom:5,background:"var(--paper-solid)",border:"1px solid var(--paper-solid)"}}>
                    <div style={{fontSize: 15,fontWeight:700,color:"var(--ink)",marginBottom:2}}>{v.name}</div>
                    <div style={{fontSize: 15,color:"var(--ink-whisper)",fontFamily:"monospace",marginBottom:5}}>{new Date(v.ts).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                    <div style={{display:"flex",gap:3,marginBottom:5}}>
                      {[{k:"N",val:v.nodes.length},{k:"E",val:v.edges.length}].map(({k,val})=><span key={k} style={{padding:"1px 5px",borderRadius:2,background:"var(--paper-solid)",fontSize: 15,color:"var(--ink-whisper)",fontFamily:"monospace"}}>{k}:{val}</span>)}
                    </div>
                    <button onClick={()=>{setNodes(v.nodes);setEdges(v.edges);setLayers(v.layers);setShowVers(false);}}
                      style={{width:"100%",padding:"4px 0",borderRadius:4,background:"rgba(244,168,58,0.1)",border:"1px solid rgba(244,168,58,0.4)",color:"#f4a83a",fontSize: 14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter Tight',sans-serif"}}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selNode&&(
          <OMProps n={selNode} kpis={kpis}
            onChange={u=>updateNode(selNode.id,u)}
            onDelete={()=>deleteNode(selNode.id)}
            onClose={()=>setSelId(null)} />
        )}
      </div>
    </div>
  );
}


export function OMPalSec({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div style={{padding:"8px 8px 5px"}}>
      <div style={{fontSize: 15,fontWeight:800,color:"var(--ink-whisper)",letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase"}}>{label}</div>
      {children}
    </div>
  );
}
export function OMPalBtn({children,onClick,active}:{children:React.ReactNode;onClick:()=>void;active?:boolean}) {
  return (
    <button onClick={onClick} style={{width:"100%",padding:"5px 7px",marginBottom:2,borderRadius:5,textAlign:"left",display:"flex",alignItems:"center",background:active?"rgba(244,168,58,0.12)":"var(--paper-solid)",border:`1px solid ${active?"rgba(244,168,58,0.5)":"var(--paper-solid)"}`,color:active?"#f4a83a":"#c9bfa8",cursor:"pointer"}}>
      {children}
    </button>
  );
}


/* ═══════════════════════════════════════════════════════════════
   KPI ALIGNMENT INLINE — Embedded within OM Lab as a tab
   Strategic objectives + KPI library + traceability
   ═══════════════════════════════════════════════════════════════ */


export function KPIAlignmentInline({ projectId }: { projectId: string }) {
  const [objectives, setObjectives] = usePersisted<OMObjective2[]>(`${projectId}_objectives`, []);
  const [kpis, setKpis]             = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [subTab, setSubTab]         = useState<"objectives"|"kpis"|"traceability">("objectives");
  const [addingObj, setAddingObj]    = useState(false);
  const [addingKpi, setAddingKpi]    = useState(false);
  const [newObj, setNewObj]          = useState<Partial<OMObjective2>>({priority:"high",status:"on-track"});
  const [newKpi, setNewKpi]          = useState<Partial<OMKpi2>>({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]});

  const IS: React.CSSProperties = {background:"#1e2030",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-primary)",padding:"6px 10px",fontSize: 15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Inter Tight',sans-serif"};
  const FL: React.CSSProperties = {fontSize: 14,fontWeight:800,color:"#8a7f6d",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3};

  const loadSamples = () => {
    const objs = KPI_DEFAULT_OBJECTIVES.map(o=>({...o,id:omUid()}));
    const kpiArr: OMKpi2[] = [
      {id:omUid(),objectiveId:objs[0].id,name:"HR cost as % of revenue",category:"Cost & Efficiency",unit:"%",currentValue:2.8,targetValue:1.9,baselineValue:3.2,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[1].id,name:"AI tool adoption rate",category:"AI & Technology",unit:"%",currentValue:22,targetValue:70,baselineValue:8,timeframe:"18 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
      {id:omUid(),objectiveId:objs[2].id,name:"Time-to-hire (days)",category:"People & Talent",unit:"days",currentValue:48,targetValue:29,baselineValue:58,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[0].id,name:"Process automation coverage",category:"Process & Speed",unit:"%",currentValue:15,targetValue:60,baselineValue:5,timeframe:"24 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
    ];
    setObjectives(objs); setKpis(kpiArr);
  };
  const progress = (k:OMKpi2) => { const total=Math.abs(k.targetValue-k.baselineValue); const done=Math.abs(k.currentValue-k.baselineValue); return total>0?Math.min(100,Math.round(done/total*100)):0; };
  const addObj = () => { if (!newObj.name?.trim()) return; setObjectives(prev=>[...prev,{id:omUid(),name:newObj.name,description:newObj.description??"",priority:newObj.priority??"high",owner:newObj.owner??"",targetDate:newObj.targetDate??"",status:newObj.status??"on-track"}]); setNewObj({priority:"high",status:"on-track"}); setAddingObj(false); };
  const addKpi = () => { if (!newKpi.name?.trim()||!newKpi.objectiveId) return; setKpis(prev=>[...prev,{id:omUid(),objectiveId:newKpi.objectiveId,name:newKpi.name,category:newKpi.category??"People & Talent",unit:newKpi.unit??"",currentValue:Number(newKpi.currentValue)||0,targetValue:Number(newKpi.targetValue)||0,baselineValue:Number(newKpi.baselineValue)||0,timeframe:newKpi.timeframe??"12 months",direction:newKpi.direction??"increase",linkedNodeIds:[],status:newKpi.status??"on-track"}]); setNewKpi({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]}); setAddingKpi(false); };

  return <Card title="KPI & Strategic Alignment">
    <div className="text-[15px] text-[var(--text-secondary)] mb-4">Link your operating model design to measurable strategic outcomes — the measurement layer of your OM.</div>
    {/* KPI summary strip */}
    <div className="flex gap-3 mb-4">{[
      {k:"Objectives",v:objectives.length,c:"#f4a83a"},
      {k:"KPIs",v:kpis.length,c:"#8ba87a"},
      {k:"On Track",v:kpis.filter(k=>k.status==="on-track").length,c:"var(--sage)"},
      {k:"At Risk",v:kpis.filter(k=>k.status==="at-risk").length,c:"var(--amber)"},
    ].map(s=><div key={s.k} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{color:s.c}}>{s.v}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">{s.k}</div></div>)}</div>
    {objectives.length===0 && kpis.length===0 && <div className="text-center py-6"><button onClick={loadSamples} className="px-4 py-2 rounded-xl text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">Load Sample KPIs & Objectives</button></div>}
    {/* Sub-tabs */}
    <div className="flex gap-1 mb-4">{(["objectives","kpis","traceability"] as const).map(t=><button key={t} onClick={()=>setSubTab(t)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold" style={{background:subTab===t?"rgba(74,158,107,0.15)":"#1e2030",color:subTab===t?"var(--sage)":"#8a7f6d"}}>{t==="objectives"?`Objectives (${objectives.length})`:t==="kpis"?`KPIs (${kpis.length})`:"Traceability"}</button>)}</div>
    {subTab==="objectives" && <div>
      <div className="flex justify-end mb-2"><button onClick={()=>setAddingObj(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add Objective</button></div>
      {addingObj && <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--surface-2)] mb-3 border border-[var(--border)]">
        <div><div style={FL}>Name *</div><input value={newObj.name??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,name:e.target.value}))} style={IS} /></div>
        <div><div style={FL}>Owner</div><input value={newObj.owner??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,owner:e.target.value}))} style={IS} /></div>
        <div className="col-span-2"><div style={FL}>Description</div><input value={newObj.description??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,description:e.target.value}))} style={IS} /></div>
        <div className="col-span-2 flex gap-2"><button onClick={addObj} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save</button><button onClick={()=>setAddingObj(false)} className="flex-1 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] cursor-pointer border border-[var(--border)]">Cancel</button></div>
      </div>}
      {objectives.map(o=>{const objKpis=kpis.filter(k=>k.objectiveId===o.id);return <div key={o.id} className="p-3 rounded-xl mb-2 bg-[var(--surface-2)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[o.status]}`}}>
        <div className="flex items-center justify-between"><div className="text-[15px] font-bold text-[var(--text-primary)]">{o.name}</div><div className="flex items-center gap-2"><span className="text-[15px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[o.status]}18`,color:KPI_STATUS_COLOR[o.status]}}>{o.status.replace("-"," ")}</span><button onClick={()=>setObjectives(p=>p.filter(x=>x.id!==o.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px] cursor-pointer">✕</button></div></div>
        <div className="text-[15px] text-[var(--text-muted)] mt-1">{o.description}</div>
        <div className="text-[14px] text-[var(--text-muted)] mt-1">{objKpis.length} KPI{objKpis.length!==1?"s":""} linked · {o.owner && `Owner: ${o.owner}`}</div>
      </div>;})}
    </div>}
    {subTab==="kpis" && <div>
      <div className="flex justify-end mb-2"><button onClick={()=>setAddingKpi(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add KPI</button></div>
      {addingKpi && objectives.length>0 && <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--surface-2)] mb-3 border border-[var(--border)]">
        <div><div style={FL}>KPI Name *</div><input value={newKpi.name??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,name:e.target.value}))} style={IS} /></div>
        <div><div style={FL}>Objective *</div><select value={newKpi.objectiveId??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,objectiveId:e.target.value}))} style={IS}><option value="">Select...</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
        <div><div style={FL}>Category</div><select value={newKpi.category} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,category:e.target.value}))} style={IS}>{KPI_CAT_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><div style={FL}>Unit</div><input value={newKpi.unit??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,unit:e.target.value}))} style={IS} placeholder="%, days, $..." /></div>
        <div><div style={FL}>Current</div><input value={newKpi.currentValue??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,currentValue:e.target.value}))} style={IS} type="number" /></div>
        <div><div style={FL}>Target</div><input value={newKpi.targetValue??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,targetValue:e.target.value}))} style={IS} type="number" /></div>
        <div className="col-span-2 flex gap-2"><button onClick={addKpi} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save KPI</button><button onClick={()=>setAddingKpi(false)} className="flex-1 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] cursor-pointer border border-[var(--border)]">Cancel</button></div>
      </div>}
      {kpis.map(k=>{const pct=progress(k);return <div key={k.id} className="p-3 rounded-xl mb-2 bg-[var(--surface-2)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[k.status]}`}}>
        <div className="flex items-center justify-between"><div className="text-[15px] font-bold text-[var(--text-primary)]">{k.name}</div><div className="flex items-center gap-2"><Badge color={k.status==="on-track"?"green":k.status==="at-risk"?"amber":"red"}>{k.status.replace("-"," ")}</Badge><button onClick={()=>setKpis(p=>p.filter(x=>x.id!==k.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px] cursor-pointer">✕</button></div></div>
        <div className="flex items-center gap-3 mt-2"><div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:KPI_STATUS_COLOR[k.status]}} /></div><span className="text-[15px] font-bold" style={{color:KPI_STATUS_COLOR[k.status]}}>{pct}%</span></div>
        <div className="flex gap-4 mt-1 text-[14px] text-[var(--text-muted)]"><span>Baseline: {k.baselineValue}{k.unit}</span><span>Current: {k.currentValue}{k.unit}</span><span>Target: {k.targetValue}{k.unit}</span><span>{k.category}</span></div>
      </div>;})}
    </div>}
    {subTab==="traceability" && <div>
      <div className="text-[15px] text-[var(--text-secondary)] mb-3">How objectives, KPIs, and operating model components connect.</div>
      {objectives.map(o=>{const objKpis=kpis.filter(k=>k.objectiveId===o.id);return <div key={o.id} className="mb-4">
        <div className="text-[15px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:KPI_STATUS_COLOR[o.status]}} />{o.name}</div>
        {objKpis.length===0?<div className="text-[15px] text-[var(--text-muted)] ml-4">No KPIs linked</div>:
        <div className="ml-4 space-y-1">{objKpis.map(k=><div key={k.id} className="flex items-center gap-2 text-[15px]"><span className="text-[var(--text-muted)]">↳</span><span className="font-semibold text-[var(--text-primary)]">{k.name}</span><span className="text-[var(--text-muted)]">{k.currentValue}{k.unit} → {k.targetValue}{k.unit}</span><span className="font-bold" style={{color:KPI_STATUS_COLOR[k.status]}}>{progress(k)}%</span></div>)}</div>}
      </div>;})}
    </div>}
  </Card>;
}


/* ═══════════════════════════════════════════════════════════════
   KPI ALIGNMENT MODULE — Strategic objectives + KPI library
   + Traceability matrix + Coverage heatmap
   Links OM canvas nodes → KPIs → Strategic objectives
   ═══════════════════════════════════════════════════════════════ */

export const KPI_CAT_LIST = ["People & Talent","Cost & Efficiency","AI & Technology","Process & Speed","Quality & Risk","Revenue & Growth"] as const;
export const KPI_STATUS_COLOR: Record<string,string> = { "on-track":"#8ba87a","at-risk":"#f4a83a","off-track":"#e87a5d","achieved":"#f4a83a" };

export const KPI_DEFAULT_OBJECTIVES: {name:string;description:string;priority:"critical"|"high"|"medium"|"low";owner:string;targetDate:string;status:"on-track"|"at-risk"|"off-track"|"achieved"}[] = [
  {name:"Reduce cost-to-serve",description:"Achieve $12M reduction in HR operating cost through AI automation and structural efficiency",priority:"critical",owner:"CHRO",targetDate:"Q4 2026",status:"on-track"},
  {name:"Accelerate AI adoption",description:"Reach 70% active AI tool usage across all functions within 18 months",priority:"high",owner:"CDO",targetDate:"Q2 2027",status:"at-risk"},
  {name:"Improve talent velocity",description:"Reduce time-to-hire by 40% and time-to-productivity by 30%",priority:"high",owner:"VP Talent",targetDate:"Q1 2027",status:"on-track"},
  {name:"Strengthen governance",description:"Establish clear decision rights and accountability across all OM layers",priority:"medium",owner:"COO",targetDate:"Q3 2026",status:"on-track"},
];

export function KPIAlignmentModule({ projectId, canvasNodes, onBack }: {
  projectId: string;
  canvasNodes: OMNode2[];
  onBack: ()=>void;
}) {
  const [objectives, setObjectives] = usePersisted<OMObjective2[]>(`${projectId}_objectives`, []);
  const [kpis, setKpis]             = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [tab, setTab]               = useState<"objectives"|"kpis"|"traceability"|"coverage">("objectives");
  const [addingObj,  setAddingObj]  = useState(false);
  const [addingKpi,  setAddingKpi]  = useState(false);
  const [newObj, setNewObj]         = useState<Partial<OMObjective2>>({priority:"high",status:"on-track"});
  const [newKpi, setNewKpi]         = useState<Partial<OMKpi2>>({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]});

  const IS: React.CSSProperties = {background:"var(--paper-solid)",border:"1px solid var(--paper-solid)",borderRadius:5,color:"var(--ink)",padding:"5px 8px",fontSize: 15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Inter Tight',sans-serif"};
  const FL: React.CSSProperties = {fontSize: 14,fontWeight:800,color:"var(--ink-whisper)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3};

  const loadSamples = () => {
    const objs = KPI_DEFAULT_OBJECTIVES.map(o=>({...o,id:omUid()}));
    const kpiArr: OMKpi2[] = [
      {id:omUid(),objectiveId:objs[0].id,name:"HR cost as % of revenue",category:"Cost & Efficiency",unit:"%",currentValue:2.8,targetValue:1.9,baselineValue:3.2,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[1].id,name:"AI tool adoption rate",category:"AI & Technology",unit:"%",currentValue:22,targetValue:70,baselineValue:8,timeframe:"18 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
      {id:omUid(),objectiveId:objs[2].id,name:"Time-to-hire (days)",category:"People & Talent",unit:"days",currentValue:48,targetValue:29,baselineValue:58,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[0].id,name:"FTE reduction — Ops & Admin",category:"Cost & Efficiency",unit:"FTE",currentValue:18,targetValue:12,baselineValue:20,timeframe:"18 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[0].id,name:"Process automation coverage",category:"Process & Speed",unit:"%",currentValue:15,targetValue:60,baselineValue:5,timeframe:"24 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
      {id:omUid(),objectiveId:objs[3].id,name:"Decision cycle time (days)",category:"Process & Speed",unit:"days",currentValue:14,targetValue:7,baselineValue:18,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
    ];
    setObjectives(objs); setKpis(kpiArr);
  };

  const progress = (k:OMKpi2) => {
    const total=Math.abs(k.targetValue-k.baselineValue);
    const done=Math.abs(k.currentValue-k.baselineValue);
    return total>0?Math.min(100,Math.round(done/total*100)):0;
  };

  const addObj = () => {
    if (!newObj.name?.trim()) return;
    setObjectives(prev=>[...prev,{id:omUid(),name:newObj.name,description:newObj.description??"",priority:newObj.priority??"high",owner:newObj.owner??"",targetDate:newObj.targetDate??"",status:newObj.status??"on-track"}]);
    setNewObj({priority:"high",status:"on-track"}); setAddingObj(false);
  };
  const addKpi = () => {
    if (!newKpi.name?.trim()||!newKpi.objectiveId) return;
    setKpis(prev=>[...prev,{id:omUid(),objectiveId:newKpi.objectiveId,name:newKpi.name,category:newKpi.category??"People & Talent",unit:newKpi.unit??"",currentValue:Number(newKpi.currentValue)||0,targetValue:Number(newKpi.targetValue)||0,baselineValue:Number(newKpi.baselineValue)||0,timeframe:newKpi.timeframe??"12 months",direction:newKpi.direction??"increase",linkedNodeIds:[],status:newKpi.status??"on-track"}]);
    setNewKpi({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]}); setAddingKpi(false);
  };

  const toggleKpiNode=(kpiId:string,nodeId:string)=>{
    setKpis(prev=>prev.map(k=>{if(k.id!==kpiId)return k;const linked=k.linkedNodeIds.includes(nodeId);return {...k,linkedNodeIds:linked?k.linkedNodeIds.filter(x=>x!==nodeId):[...k.linkedNodeIds,nodeId]};}));
  };

  const orphanKpis  = kpis.filter(k=>k.linkedNodeIds.length===0);
  const coveredNodes= canvasNodes.filter(n=>(n.kpiIds??[]).length>0||kpis.some(k=>k.linkedNodeIds.includes(n.id))).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1">← Back</button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--sage)] to-[var(--sage)] flex items-center justify-center text-xl">◎</div>
        <div><h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">KPI & Strategic Alignment</h1><p className="text-[15px] text-[var(--text-secondary)]">Link your operating model design to measurable strategic outcomes</p></div>
        <div className="flex-1" />
        {objectives.length===0&&<button onClick={loadSamples} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">Load sample data</button>}
      </div>

      {/* Summary strip */}
      {(objectives.length>0||kpis.length>0)&&(
        <div className="grid grid-cols-6 gap-3 mb-5">
          {[
            {k:"Objectives",  v:objectives.length,                 c:"#f4a83a"},
            {k:"KPIs",        v:kpis.length,                       c:"var(--info,var(--accent-primary))"},
            {k:"Coverage",    v:`${kpis.length?Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100):0}%`, c:kpis.every(k=>k.linkedNodeIds.length>0)&&kpis.length>0?"#8ba87a":"#f4a83a"},
            {k:"At Risk",     v:kpis.filter(k=>k.status==="at-risk").length, c:"#f4a83a"},
            {k:"Off Track",   v:kpis.filter(k=>k.status==="off-track").length, c:"#e87a5d"},
            {k:"Nodes w/ KPI",v:`${canvasNodes.length?Math.round(coveredNodes/canvasNodes.length*100):0}%`, c:"#8ba87a"},
          ].map(({k,v,c})=>(
            <div key={k} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3">
              <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{k}</div>
              <div className="text-xl font-extrabold" style={{color:c}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <TabBar tabs={[
        {id:"objectives",   label:`Objectives (${objectives.length})`},
        {id:"kpis",         label:`KPIs (${kpis.length})`},
        {id:"traceability", label:"Traceability"},
        {id:"coverage",     label:"Coverage"},
      ]} active={tab} onChange={t=>setTab(t as typeof tab)} />

      {/* ── OBJECTIVES ── */}
      {tab==="objectives"&&(
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={()=>setAddingObj(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add Objective</button>
          </div>
          {addingObj&&(
            <div className="p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--accent-primary)]/30 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2"><div style={FL}>Name *</div><input value={newObj.name??""} onChange={e=>setNewObj((s)=>({...s,name:e.target.value}))} style={IS} /></div>
                <div className="col-span-2"><div style={FL}>Description</div><textarea value={newObj.description??""} onChange={e=>setNewObj((s)=>({...s,description:e.target.value}))} rows={2} style={{...IS,resize:"vertical"}} /></div>
                <div><div style={FL}>Priority</div><select value={newObj.priority} onChange={e=>setNewObj((s)=>({...s,priority:e.target.value}))} style={IS}>{["critical","high","medium","low"].map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div><div style={FL}>Owner</div><input value={newObj.owner??""} onChange={e=>setNewObj((s)=>({...s,owner:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Target Date</div><input value={newObj.targetDate??""} onChange={e=>setNewObj((s)=>({...s,targetDate:e.target.value}))} placeholder="Q4 2026" style={IS} /></div>
                <div><div style={FL}>Status</div><select value={newObj.status} onChange={e=>setNewObj((s)=>({...s,status:e.target.value}))} style={IS}>{["on-track","at-risk","off-track","achieved"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addObj} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save</button>
                <button onClick={()=>setAddingObj(false)} className="px-4 py-1.5 rounded-lg text-[15px] text-[var(--text-muted)] border border-[var(--border)] cursor-pointer bg-transparent">Cancel</button>
              </div>
            </div>
          )}
          {objectives.length===0&&!addingObj&&<div className="text-center py-12 text-[var(--text-muted)]"><div className="text-2xl mb-2 opacity-30">◎</div>No objectives yet. Add them or load sample data.</div>}
          {objectives.map(o=>{
            const objKpis=kpis.filter(k=>k.objectiveId===o.id);
            const onTrack=objKpis.filter(k=>k.status==="on-track"||k.status==="achieved").length;
            return (
              <div key={o.id} className="p-4 rounded-xl mb-3 bg-[var(--surface-1)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[o.status]}`}}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{o.name}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[o.status]}18`,color:KPI_STATUS_COLOR[o.status]}}>{o.status.replace("-"," ")}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] capitalize">{o.priority}</span>
                    </div>
                    <div className="text-[15px] text-[var(--text-muted)] mb-2">{o.description}</div>
                    <div className="flex gap-4 text-[15px] text-[var(--text-muted)]">
                      {o.owner&&<span>Owner: <strong className="text-[var(--text-secondary)]">{o.owner}</strong></span>}
                      {o.targetDate&&<span>Target: <strong className="text-[var(--text-secondary)]">{o.targetDate}</strong></span>}
                      <span>{objKpis.length} KPI{objKpis.length!==1?"s":""} · {onTrack} on track</span>
                    </div>
                  </div>
                  <button onClick={()=>setObjectives(prev=>prev.filter(x=>x.id!==o.id))} className="text-[var(--risk)] text-sm border-none bg-transparent cursor-pointer">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── KPIS ── */}
      {tab==="kpis"&&(
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={()=>setAddingKpi(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add KPI</button>
          </div>
          {addingKpi&&(
            <div className="p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--accent-primary)]/30 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><div style={FL}>KPI Name *</div><input value={newKpi.name??""} onChange={e=>setNewKpi((s)=>({...s,name:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Objective *</div><select value={newKpi.objectiveId??""} onChange={e=>setNewKpi((s)=>({...s,objectiveId:e.target.value}))} style={IS}><option value="">Select…</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.name.slice(0,32)}</option>)}</select></div>
                <div><div style={FL}>Category</div><select value={newKpi.category} onChange={e=>setNewKpi((s)=>({...s,category:e.target.value}))} style={IS}>{KPI_CAT_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><div style={FL}>Unit</div><input value={newKpi.unit??""} onChange={e=>setNewKpi((s)=>({...s,unit:e.target.value}))} placeholder="%, days, $M, FTE…" style={IS} /></div>
                <div><div style={FL}>Baseline</div><input type="number" value={newKpi.baselineValue??""} onChange={e=>setNewKpi((s)=>({...s,baselineValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Current</div><input type="number" value={newKpi.currentValue??""} onChange={e=>setNewKpi((s)=>({...s,currentValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Target</div><input type="number" value={newKpi.targetValue??""} onChange={e=>setNewKpi((s)=>({...s,targetValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Direction</div><select value={newKpi.direction} onChange={e=>setNewKpi((s)=>({...s,direction:e.target.value}))} style={IS}><option value="increase">Increase</option><option value="decrease">Decrease</option><option value="maintain">Maintain</option></select></div>
                <div><div style={FL}>Timeframe</div><input value={newKpi.timeframe??""} onChange={e=>setNewKpi((s)=>({...s,timeframe:e.target.value}))} placeholder="12 months" style={IS} /></div>
                <div><div style={FL}>Status</div><select value={newKpi.status} onChange={e=>setNewKpi((s)=>({...s,status:e.target.value}))} style={IS}>{["on-track","at-risk","off-track","achieved"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addKpi} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save KPI</button>
                <button onClick={()=>setAddingKpi(false)} className="px-4 py-1.5 rounded-lg text-[15px] text-[var(--text-muted)] border border-[var(--border)] cursor-pointer bg-transparent">Cancel</button>
              </div>
            </div>
          )}
          {kpis.length===0&&!addingKpi&&<div className="text-center py-12 text-[var(--text-muted)]"><div className="text-2xl mb-2 opacity-30">◎</div>No KPIs yet.</div>}
          {kpis.map(k=>{
            const pct=progress(k);
            const obj=objectives.find(o=>o.id===k.objectiveId);
            return (
              <div key={k.id} className="p-4 rounded-xl mb-3 bg-[var(--surface-1)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[k.status]}`}}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{k.name}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[k.status]}18`,color:KPI_STATUS_COLOR[k.status]}}>{k.status.replace("-"," ")}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">{k.category}</span>
                      {k.linkedNodeIds.length>0&&<span className="text-[14px] text-[var(--success)]">⬡ {k.linkedNodeIds.length} node{k.linkedNodeIds.length!==1?"s":""}</span>}
                    </div>
                    {obj&&<div className="text-[14px] text-[var(--text-muted)] mb-2">→ {obj.name}</div>}
                    <div className="flex gap-4 text-[15px] mb-2">
                      <span className="text-[var(--text-muted)]">Base: <strong className="text-[var(--text-primary)]">{k.baselineValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">Now: <strong style={{color:KPI_STATUS_COLOR[k.status]}}>{k.currentValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">Target: <strong className="text-[var(--accent-primary)]">{k.targetValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">{k.timeframe}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,background:KPI_STATUS_COLOR[k.status],transition:"width 0.4s"}} /></div>
                    <div className="text-[14px] text-[var(--text-muted)] mt-1">{pct}% to target</div>
                  </div>
                  <button onClick={()=>setKpis(prev=>prev.filter(x=>x.id!==k.id))} className="text-[var(--risk)] text-sm border-none bg-transparent cursor-pointer">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TRACEABILITY MATRIX ── */}
      {tab==="traceability"&&(
        <div>
          {objectives.length===0||kpis.length===0?(
            <div className="text-center py-12 text-[var(--text-muted)] text-[15px]">Add objectives and KPIs first.</div>
          ):(
            <>
              <div className="text-[15px] text-[var(--text-secondary)] mb-3">Click a cell to link a KPI to an objective. Click canvas node buttons to assign accountability.</div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-[15px] border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-1)]">
                      <th className="px-3 py-2.5 text-left font-bold text-[14px] text-[var(--accent-primary)] uppercase tracking-widest border border-[var(--border)] min-w-[200px]">KPI</th>
                      {objectives.map(o=>(
                        <th key={o.id} className="px-2 py-1 text-center text-[14px] font-bold border border-[var(--border)] min-w-[80px]" style={{color:KPI_STATUS_COLOR[o.status]}}>
                          <div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",maxHeight:80,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{o.name}</div>
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center text-[14px] text-[var(--text-muted)] border border-[var(--border)] min-w-[100px]">OM Nodes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.map((k,ri)=>{
                      const obj=objectives.find(o=>o.id===k.objectiveId);
                      return (
                        <tr key={k.id} className={ri%2===0?"bg-[var(--bg)]":"bg-[var(--surface-1)]"}>
                          <td className="px-3 py-2 border border-[var(--border)]">
                            <div className="font-semibold text-[var(--text-primary)]">{k.name}</div>
                            <div className="text-[14px] text-[var(--text-muted)]">{k.currentValue}{k.unit} → {k.targetValue}{k.unit}</div>
                          </td>
                          {objectives.map(o=>{
                            const isLinked=k.objectiveId===o.id;
                            return (
                              <td key={o.id} className="text-center border border-[var(--border)] cursor-pointer"
                                style={{background:isLinked?`${KPI_STATUS_COLOR[o.status]}12`:undefined}}
                                onClick={()=>setKpis(prev=>prev.map(x=>x.id!==k.id?x:{...x,objectiveId:isLinked?"":o.id}))}>
                                {isLinked&&<span style={{fontSize:14,color:KPI_STATUS_COLOR[o.status]}}>●</span>}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 border border-[var(--border)]">
                            <div className="flex gap-1 flex-wrap">
                              {canvasNodes.slice(0,5).map((n)=>{
                                const linked=k.linkedNodeIds.includes(n.id);
                                return (
                                  <button key={n.id} onClick={()=>toggleKpiNode(k.id,n.id)}
                                    className="text-[15px] px-1.5 py-0.5 rounded cursor-pointer font-semibold transition-all"
                                    style={{background:linked?`${n.color||"#f4a83a"}20`:"transparent",border:`1px solid ${linked?n.color||"#f4a83a":"var(--paper-solid)"}`,color:linked?n.color||"#f4a83a":"var(--ink-whisper)"}}>
                                    {(n.label||"").slice(0,7)}
                                  </button>
                                );
                              })}
                              {canvasNodes.length>5&&<span className="text-[15px] text-[var(--text-muted)] self-center">+{canvasNodes.length-5}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COVERAGE HEATMAP ── */}
      {tab==="coverage"&&(
        <div>
          {orphanKpis.length>0&&(
            <div className="p-3 rounded-xl border mb-4" style={{background:"rgba(240,165,0,0.07)",borderColor:"rgba(240,165,0,0.25)"}}>
              <div className="text-[15px] font-bold mb-2" style={{color:"var(--amber)"}}>⚠ {orphanKpis.length} KPI{orphanKpis.length!==1?"s":""} not linked to any org node</div>
              {orphanKpis.map(k=><div key={k.id} className="text-[15px] text-[var(--text-muted)] mb-1">· {k.name}</div>)}
            </div>
          )}
          {canvasNodes.length===0?(
            <div className="text-center py-12 text-[var(--text-muted)] text-[15px]"><div className="text-2xl mb-2 opacity-30">⬡</div>No canvas nodes — open OM Design Canvas first and create your operating model.</div>
          ):(
            <div className="grid grid-cols-3 gap-4">
              {canvasNodes.map((n)=>{
                const linkedKpis=kpis.filter(k=>k.linkedNodeIds.includes(n.id));
                const atRisk=linkedKpis.filter(k=>k.status==="at-risk"||k.status==="off-track").length;
                const hasAny=linkedKpis.length>0;
                const nodeColor=n.color||"#f4a83a";
                return (
                  <div key={n.id} className="p-3 rounded-xl border transition-all" style={{background:"var(--surface-1)",borderColor:hasAny?`${nodeColor}40`:"var(--border)",borderLeft:`3px solid ${hasAny?nodeColor:"var(--border)"}`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:nodeColor}} />
                      <span className="text-[15px] font-bold text-[var(--text-primary)] truncate flex-1">{n.label||n.type}</span>
                      {!hasAny&&<span className="text-[15px] text-[var(--text-muted)]">—</span>}
                    </div>
                    {linkedKpis.length===0&&<div className="text-[14px] text-[var(--text-muted)] italic">No KPIs assigned</div>}
                    {linkedKpis.map(k=>(
                      <div key={k.id} className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:KPI_STATUS_COLOR[k.status]}} />
                        <span className="text-[15px] text-[var(--text-secondary)] flex-1 truncate">{k.name}</span>
                        <span className="text-[14px] font-semibold shrink-0" style={{color:KPI_STATUS_COLOR[k.status],fontFamily:"monospace"}}>{k.currentValue}{k.unit}</span>
                      </div>
                    ))}
                    {atRisk>0&&<div className="text-[14px] mt-1" style={{color:"var(--amber)"}}>⚠ {atRisk} at risk</div>}
                  </div>
                );
              })}
            </div>
          )}
          {kpis.length>0&&canvasNodes.length>0&&(
            <div className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <div className="text-[15px] font-bold text-[var(--text-primary)] mb-3">Design Health: KPI Coverage</div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--success)] transition-all" style={{width:`${Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100)}%`}} />
                </div>
                <span className="text-[15px] font-extrabold text-[var(--success)]">{Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100)}%</span>
              </div>
              <div className="text-[15px] text-[var(--text-muted)] mt-1">{kpis.filter(k=>k.linkedNodeIds.length>0).length} of {kpis.length} KPIs assigned to org nodes — {orphanKpis.length>0?`${orphanKpis.length} orphaned (design gap)`:"all covered ✓"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
