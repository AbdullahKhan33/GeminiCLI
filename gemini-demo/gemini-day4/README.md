# Gemini Day 4 Demo UI

A simple UI skin for the flow you already built:

1. `src/index-docs.js`
2. `src/search.js`
3. `src/rag.js`
4. `src/mcp-rag.ts`

## Copy into your existing `gemini-day4` folder

Copy:

- `demo-server.js`
- `demo-ui/`

Your existing Day 4 files stay exactly where they are.

## Install two UI dependencies

```bash
npm install express @modelcontextprotocol/client
```

You should already have:

```bash
npm install @google/genai dotenv @modelcontextprotocol/server zod tsx
```

## Run

```bash
node demo-server.js
```

Then open:

```text
http://localhost:3000
```

## Step 4

Step 4 is a real MCP call. The backend:

- creates an MCP client
- launches `src/mcp-rag.ts` over stdio
- discovers `search-company-knowledge`
- calls the tool with the question
- receives the RAG context
- passes that context to Gemini
- shows the trace and final answer

The UI uses your existing `.env` and `GEMINI_API_KEY`.
