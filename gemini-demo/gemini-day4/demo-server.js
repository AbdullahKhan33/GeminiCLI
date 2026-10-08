import "dotenv/config";

import express from "express";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI } from "@google/genai";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";


// ======================================================
// BASIC SETUP
// ======================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 3000;

app.use(express.json());


// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
    //   "demo-ui.html"
    "gemini-rag-pipeline-with-agent.html"
    )
  );

});


// ======================================================
// HELPER:
// RUN EXISTING NODE SCRIPTS
// ======================================================

function runCommand(command, args = []) {

  return new Promise(
    (resolve, reject) => {

      const child = spawn(
        command,
        args,
        {
          cwd: __dirname,
          env: process.env
        }
      );


      let output = "";
      let errors = "";


      child.stdout.on(
        "data",
        data => {

          output +=
            data.toString();

        }
      );


      child.stderr.on(
        "data",
        data => {

          errors +=
            data.toString();

        }
      );


      child.on(
        "error",
        error => {

          reject(error);

        }
      );


      child.on(
        "close",
        code => {

          if (code !== 0) {

            reject(
              new Error(
                output +
                "\n" +
                errors
              )
            );

            return;

          }


          resolve(
            output ||
            errors
          );

        }
      );

    }
  );

}


// ======================================================
// CHECK ENVIRONMENT
// ======================================================

app.get(
  "/api/status",

  (req, res) => {

    res.json({

      apiKey:
        Boolean(
          process.env.GEMINI_API_KEY
        ),

      status: "ready"

    });

  }
);


// ======================================================
// STEP 1
// INDEX DOCUMENTS
// ======================================================

app.post(
  "/api/index",

  async (req, res) => {

    try {

      const output =
        await runCommand(
          "node",
          [
            "src/index-docs.js"
          ]
        );


      res.json({

        success: true,

        output

      });

    }

    catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ======================================================
// STEP 2
// SEMANTIC SEARCH
// ======================================================

app.post(
  "/api/search",

  async (req, res) => {

    try {

      const question =
        req.body.question;


      if (!question) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Please enter a question."

          });

      }


      const output =
        await runCommand(
          "node",
          [
            "src/search.js",
            question
          ]
        );


      res.json({

        success: true,

        output

      });

    }

    catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ======================================================
// STEP 3
// NORMAL RAG
// ======================================================

app.post(
  "/api/rag",

  async (req, res) => {

    try {

      const question =
        req.body.question;


      if (!question) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Please enter a question."

          });

      }


      const output =
        await runCommand(
          "node",
          [
            "src/rag.js",
            question
          ]
        );


      res.json({

        success: true,

        output

      });

    }

    catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }
);


// ======================================================
// STEP 4
// MCP + RAG
// ======================================================

app.post(
  "/api/mcp-rag",

  async (req, res) => {

    let client;

    try {

      const question =
        req.body.question;


      if (!question) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Please enter a question."

          });

      }


      // ----------------------------------------------
      // CREATE MCP CLIENT
      // ----------------------------------------------

      client =
        new Client({

          name:
            "rag-demo-ui",

          version:
            "1.0.0"

        });


      // ----------------------------------------------
      // START EXISTING MCP SERVER
      // ----------------------------------------------

      const transport =
        new StdioClientTransport({

          command:
            "npx",

          args: [
            "tsx",
            "src/mcp-rag.ts"
          ]

        });


      // ----------------------------------------------
      // MCP HANDSHAKE
      // ----------------------------------------------

      await client.connect(
        transport
      );


      // ----------------------------------------------
      // DISCOVER TOOLS
      // ----------------------------------------------

      const toolResponse =
        await client.listTools();


      const tools =
        toolResponse.tools || [];


      const toolNames =
        tools.map(
          tool =>
            tool.name
        );


      if (
        !toolNames.includes(
          "search-company-knowledge"
        )
      ) {

        throw new Error(
          "search-company-knowledge tool was not discovered."
        );

      }


      // ----------------------------------------------
      // CALL RAG TOOL
      // ----------------------------------------------

      const toolResult =
        await client.callTool({

          name:
            "search-company-knowledge",

          arguments: {

            question

          }

        });


      if (toolResult.isError) {

        throw new Error(
          "MCP RAG tool returned an error."
        );

      }


      // ----------------------------------------------
      // EXTRACT TEXT RETURNED BY MCP
      // ----------------------------------------------

      const context =
        (toolResult.content || [])

          .filter(
            item =>
              item.type === "text"
          )

          .map(
            item =>
              item.text
          )

          .join("\n");


      if (!context) {

        throw new Error(
          "MCP tool returned no context."
        );

      }


      // ----------------------------------------------
      // ASK GEMINI USING MCP RETRIEVED CONTEXT
      // ----------------------------------------------

      const apiKey =
        process.env.GEMINI_API_KEY;


      if (!apiKey) {

        throw new Error(
          "GEMINI_API_KEY not found."
        );

      }


      const ai =
        new GoogleGenAI({

          apiKey

        });


      const model =
        process.env
          .GEMINI_GENERATION_MODEL
        ||
        "gemini-3.5-flash";


      const prompt = `

You are an enterprise knowledge assistant.

Answer the user's question using ONLY
the company context retrieved through MCP.

If the answer cannot be found in the
retrieved context, say:

"I don't have enough information in
the available company documents."

USER QUESTION:

${question}


MCP RETRIEVED CONTEXT:

${context}

`;


      const response =
        await ai.models.generateContent({

          model,

          contents: prompt

        });


      // ----------------------------------------------
      // CREATE DEMO TRACE
      // ----------------------------------------------

      const trace = `

1. USER QUESTION
   ${question}

2. MCP CLIENT STARTED

3. MCP SERVER CONNECTED
   src/mcp-rag.ts

4. TOOLS DISCOVERED
   ${toolNames.join(", ")}

5. TOOL SELECTED
   search-company-knowledge

6. TOOL ARGUMENT
   question = "${question}"

7. VECTOR SEARCH EXECUTED

8. RELEVANT COMPANY CONTEXT RETURNED

9. CONTEXT PASSED TO GEMINI

10. GROUNDED ANSWER GENERATED

`;


      res.json({

        success: true,

        trace,

        context,

        answer:
          response.text

      });

    }

    catch (error) {

      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

    finally {

      try {

        if (client) {

          await client.close();

        }

      }

      catch {

        // ignore demo shutdown errors

      }

    }

  }
);

// ======================================================
// STEP 5
// AGENTIC WORKFLOW
// ======================================================

app.post(
  "/api/agent",

  async (req, res) => {

    try {

      const goal =
        String(
          req.body.goal || ""
        ).trim();


      if (!goal) {

        return res
          .status(400)
          .json({

            success: false,

            error:
              "Please enter an agent goal."

          });

      }


      console.log(
        "\nAgent Goal:"
      );

      console.log(goal);


      // --------------------------------------------------
      // RUN THE AGENT
      // --------------------------------------------------

      const output =
        await runCommand(
          "node",
          [
            "src/agent.js",
            goal,
            "--json"
          ]
        );


      console.log(
        "\nAgent Raw Output:"
      );

      console.log(output);


      // --------------------------------------------------
      // PARSE AGENT RESULT
      // --------------------------------------------------

      let result;


      try {

        result =
          JSON.parse(
            output.trim()
          );

      }

      catch (parseError) {

        throw new Error(
          `Agent returned invalid JSON:\n${output}`
        );

      }


      if (!result.ok) {

        throw new Error(
          result.error ||
          "Agent execution failed."
        );

      }


      // --------------------------------------------------
      // RETURN TO UI
      // --------------------------------------------------

      res.json({

        success: true,

        trace:
          result.trace || [],

        answer:
          result.finalAnswer ||
          "Agent completed."

      });

    }

    catch (error) {

      console.error(
        "Agent API Error:",
        error
      );


      res.status(500).json({

        success: false,

        error:
          error.message

      });

    }

  }

);


// ======================================================
// START WEB SERVER
// ======================================================

app.listen(
  PORT,

  () => {

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      "Gemini RAG Demo UI"
    );

    console.log(
      "================================="
    );

    console.log(
      `http://localhost:${PORT}`
    );

    console.log("");

  }
);