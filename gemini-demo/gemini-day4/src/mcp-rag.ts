import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import fs from "fs";


// ==================================================
// 1. CONFIGURATION
// ==================================================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY was not found. Check your .env file."
  );
}


// ==================================================
// 2. CREATE GEMINI CLIENT
// ==================================================

const ai = new GoogleGenAI({
  apiKey
});


// ==================================================
// 3. TYPES
// ==================================================

type KnowledgeChunk = {
  source: string;
  text: string;
  embedding: number[];
};

type SearchResult = {
  source: string;
  text: string;
  score: number;
};


// ==================================================
// 4. LOAD LOCAL VECTOR STORE
// ==================================================

if (!fs.existsSync("knowledge.json")) {
  throw new Error(
    "knowledge.json was not found. Run index-docs.js first."
  );
}


const knowledge: KnowledgeChunk[] =
  JSON.parse(
    fs.readFileSync(
      "knowledge.json",
      "utf8"
    )
  );


console.error(
  `Loaded ${knowledge.length} knowledge chunks`
);


// ==================================================
// 5. COSINE SIMILARITY
// ==================================================

function cosineSimilarity(
  a: number[],
  b: number[]
): number {

  if (a.length !== b.length) {
    throw new Error(
      "Embedding dimensions do not match."
    );
  }


  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;


  for (let i = 0; i < a.length; i++) {

    dotProduct += a[i] * b[i];

    magnitudeA += a[i] * a[i];

    magnitudeB += b[i] * b[i];

  }


  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }


  return (
    dotProduct /
    (
      Math.sqrt(magnitudeA) *
      Math.sqrt(magnitudeB)
    )
  );
}


// ==================================================
// 6. CREATE MCP SERVER FACTORY
// ==================================================

function createServer() {

  const server = new McpServer({

    name: "company-knowledge",

    version: "1.0.0"

  });


  // ==================================================
  // 7. REGISTER RAG SEARCH TOOL
  // ==================================================

  server.registerTool(

    "search-company-knowledge",

    {

      description: `
Search the internal company knowledge base.

Use this tool whenever the user asks questions
about internal company information such as:

- leave policies
- travel policies
- reimbursement rules
- IT support policies
- incident priorities
- employee policies
- internal procedures

The tool performs semantic search against
company documents and returns the most
relevant document passages.
`,

      inputSchema: z.object({

        question: z
          .string()
          .min(3)
          .describe(
            "The user's question about internal company knowledge"
          )

      })

    },


    async ({ question }) => {

      try {

        console.error(
          `Searching company knowledge for: ${question}`
        );


        // ============================================
        // 8. CREATE EMBEDDING FOR USER QUESTION
        // ============================================

        const embeddingResponse =
          await ai.models.embedContent({

            model: "gemini-embedding-2",

            contents: question,

            config: {

              outputDimensionality: 768

            }

          });


        const queryEmbedding =
          embeddingResponse
            .embeddings?.[0]?.values;


        if (!queryEmbedding) {

          return {

            content: [
              {
                type: "text",
                text:
                  "Unable to generate an embedding for the question."
              }
            ],

            isError: true

          };

        }


        // ============================================
        // 9. SEMANTIC VECTOR SEARCH
        // ============================================

        const results: SearchResult[] =
          knowledge

            .map(
              (chunk): SearchResult => ({

                source: chunk.source,

                text: chunk.text,

                score:
                  cosineSimilarity(
                    queryEmbedding,
                    chunk.embedding
                  )

              })
            )

            .sort(
              (a, b) =>
                b.score - a.score
            )

            .slice(0, 3);


        // ============================================
        // 10. NO RESULTS
        // ============================================

        if (results.length === 0) {

          return {

            content: [
              {
                type: "text",

                text:
                  "No relevant information was found in the company knowledge base."
              }
            ],

            isError: true

          };

        }


        // ============================================
        // 11. FORMAT RETRIEVED CONTEXT
        // ============================================

        const context =
          results

            .map(
              (
                result,
                index
              ) => `

RESULT ${index + 1}

Source:
${result.source}

Similarity:
${result.score.toFixed(4)}

Content:
${result.text}

`
            )

            .join(
              "\n--------------------------------\n"
            );


        // ============================================
        // 12. RETURN CONTEXT TO GEMINI CLI
        // ============================================

        return {

          content: [
            {

              type: "text",

              text: `

Relevant company knowledge:

${context}

Use these retrieved passages to answer
the user's question.

Do not invent company policy that is not
supported by the retrieved information.

`

            }
          ]

        };

      }

      catch (error) {

        console.error(
          "Knowledge search error:",
          error
        );


        return {

          content: [
            {

              type: "text",

              text:
                "The company knowledge search failed unexpectedly."

            }
          ],

          isError: true

        };

      }

    }

  );


  // ==================================================
  // 13. RETURN MCP SERVER
  // ==================================================

  return server;

}


// ==================================================
// 14. START MCP SERVER
// ==================================================

console.error(
  "Company Knowledge MCP server running"
);

console.error(
  "Tool available: search-company-knowledge"
);


void serveStdio(createServer);