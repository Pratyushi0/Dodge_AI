require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { initDB } = require('./db');
const { runQuery, QUERY_CATALOG } = require('./queryEngine');

const app  = express();
const port = process.env.PORT || 3001;
const db   = initDB();

// ─── Gemini Setup ─────────────────────────────────────────────────────────────
if (!process.env.GOOGLE_API_KEY) {
  console.error("ERROR: GOOGLE_API_KEY is missing in .env file!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// FIXED: was "gemini-pro" (deprecated) -> now "gemini-2.5-flash"
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

const SYSTEM_PROMPT = `You are an Order-to-Cash (O2C) data analyst AI assistant.
You ONLY answer questions about this specific business dataset.
If asked anything unrelated (general knowledge, coding, creative writing, etc.),
respond exactly with: "This system is designed to answer questions related to the Order-to-Cash dataset only."

${QUERY_CATALOG}

When you need data, return ONLY this JSON (no other text):
{"action":"query","queryName":"<name>","params":{"billingDocId":"BD001"}}

When analyzing results, format INR amounts as Rs.X,XX,XXX. Be specific and concise.`;

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/graph', (req, res) => {
  try { res.json(runQuery(db, 'graph_nodes')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      totalRevenue:   db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM billing_docs').get().v,
      totalCollected: db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM payments WHERE status='Cleared'").get().v,
      openOrders:     db.prepare("SELECT COUNT(*) as v FROM sales_orders WHERE status='Open'").get().v,
      brokenFlows:    db.prepare(`
        SELECT COUNT(*) as v FROM sales_orders so WHERE
          (EXISTS(SELECT 1 FROM deliveries d WHERE d.sales_order_id=so.id)
           AND NOT EXISTS(SELECT 1 FROM billing_docs bd WHERE bd.sales_order_id=so.id))
          OR
          (NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.sales_order_id=so.id)
           AND EXISTS(SELECT 1 FROM billing_docs bd WHERE bd.sales_order_id=so.id))
      `).get().v,
      customerCount: db.prepare('SELECT COUNT(*) as v FROM customers').get().v,
      invoiceCount:  db.prepare('SELECT COUNT(*) as v FROM billing_docs').get().v,
    };
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const userText = messages[messages.length - 1].content;

    // Pass 1: ask Gemini what to do
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser: ${userText}`);
    const text   = result.response.text().trim();

    // Domain restriction check
    if (text.includes('designed to answer questions related to the Order-to-Cash dataset only')) {
      return res.json({ type: 'restriction', message: text });
    }

    // Check if Gemini wants to run a query
    let action;
    try {
      // Strip markdown block formatting if present
      const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      action = JSON.parse(cleanText);
    } catch (e) {
      // Fallback regex if there's extra text: match from first { to last }
      const match = text.match(/\{[\s\S]*"action"\s*:\s*"query"[\s\S]*\}/);
      if (match) {
        try { action = JSON.parse(match[0]); } catch (err) {}
      }
    }

    if (action && action.action === 'query') {
      const data = runQuery(db, action.queryName, action.params || {});

      // Pass 2: analyze the results
      const analysis = await model.generateContent(
        `The user asked: "${userText}"\n\nQuery results:\n${JSON.stringify(data, null, 2)}\n\nAnalyze these results and answer the user. Format amounts in INR. Be specific and concise.`
      );
      const finalMessage = analysis.response.text();

      const highlightIds = extractHighlightIds(action.queryName, data);

      return res.json({
        type: 'query_result',
        queryName: action.queryName,
        message: finalMessage,
        queryResult: data,
        highlightIds,
      });
    }

    res.json({ type: 'answer', message: text });

  } catch (err) {
    console.error("Backend Chat Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/query', (req, res) => {
  const { queryName, params } = req.body;
  try { res.json(runQuery(db, queryName, params || {})); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

function extractHighlightIds(queryName, result) {
  const ids = new Set();
  if (queryName === 'trace_billing_document' && result) {
    [result.billing && result.billing.id, result.salesOrder && result.salesOrder.id,
     result.customer && result.customer.id, result.delivery && result.delivery.id]
      .filter(Boolean).forEach(function(id) { ids.add(id); });
    if (result.payments) result.payments.forEach(function(p) { ids.add(p.id); });
    if (result.journalEntries) result.journalEntries.forEach(function(j) { ids.add(j.id); });
    if (result.items) result.items.forEach(function(i) { ids.add(i.id); });
  } else if (queryName === 'broken_flows' && result) {
    if (result.deliveredNotBilled) result.deliveredNotBilled.forEach(function(r) { ids.add(r.id); });
    if (result.billedNoDelivery) result.billedNoDelivery.forEach(function(r) { ids.add(r.id); });
  } else if (queryName === 'unpaid_invoices' && Array.isArray(result)) {
    result.forEach(function(r) { ids.add(r.id); });
  }
  return Array.from(ids);
}

app.listen(port, "0.0.0.0", () => {
  console.log(`\n🚀 O2C Graph API running on port ${port}`);
  console.log('   Model: gemini-1.5-flash');
  console.log('   GET  /api/graph');
  console.log('   GET  /api/stats');
  console.log('   POST /api/chat');
});