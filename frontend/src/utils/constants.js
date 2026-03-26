// constants.js
export const NODE_COLORS = {
  customer:   { fill: '#1e3a5f', stroke: '#38bdf8', text: '#7dd3fc', glow: '#38bdf840' },
  product:    { fill: '#1a3a2a', stroke: '#22c55e', text: '#86efac', glow: '#22c55e40' },
  salesOrder: { fill: '#3a2a10', stroke: '#f59e0b', text: '#fcd34d', glow: '#f59e0b40' },
  soItem:     { fill: '#2a2a35', stroke: '#8b8fa8', text: '#c4c7d4', glow: '#8b8fa820' },
  delivery:   { fill: '#1e3530', stroke: '#14b8a6', text: '#5eead4', glow: '#14b8a640' },
  billing:    { fill: '#2d1e50', stroke: '#a78bfa', text: '#c4b5fd', glow: '#a78bfa40' },
  payment:    { fill: '#3a1e2a', stroke: '#f472b6', text: '#fbcfe8', glow: '#f472b640' },
  journal:    { fill: '#3a2020', stroke: '#fb923c', text: '#fdba74', glow: '#fb923c40' },
};

export const NODE_LABELS = {
  customer:   'Customer',
  product:    'Product',
  salesOrder: 'Sales Order',
  soItem:     'SO Item',
  delivery:   'Delivery',
  billing:    'Billing Doc',
  payment:    'Payment',
  journal:    'Journal Entry',
};

export const NODE_RADIUS = {
  customer:   16,
  product:    12,
  salesOrder: 14,
  soItem:     8,
  delivery:   12,
  billing:    13,
  payment:    11,
  journal:    10,
};

export const FILTERS = [
  { id: 'all',       label: 'All Nodes',   types: null },
  { id: 'flow',      label: 'Core Flow',   types: ['customer','salesOrder','delivery','billing','payment','journal'] },
  { id: 'customer',  label: 'Customers',   types: ['customer','salesOrder','soItem','product'] },
  { id: 'financial', label: 'Financial',   types: ['billing','payment','journal','salesOrder'] },
  { id: 'product',   label: 'Products',    types: ['product','soItem','salesOrder'] },
];

export const QUICK_PROMPTS = [
  { label: 'Top billed products',        text: 'Which products are associated with the highest number of billing documents?' },
  { label: 'Trace BD001',                text: 'Trace the full flow of billing document BD001' },
  { label: 'Broken flows',               text: 'Show me all sales orders with broken or incomplete flows' },
  { label: 'Unpaid invoices',            text: 'Which invoices are still unpaid?' },
  { label: 'Customer summary',           text: 'Give me a summary of revenue by customer' },
  { label: 'Monthly revenue',            text: 'What is the revenue trend by month?' },
  { label: 'Sales rep performance',      text: 'How is each sales rep performing?' },
];

export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";
