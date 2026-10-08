import "dotenv/config";

import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY was not found in .env.");
}

const model =
  process.env.GEMINI_AGENT_MODEL ||
  process.env.GEMINI_GENERATION_MODEL ||
  "gemini-3.8-flash";

const rawArgs = process.argv.slice(2);
const jsonMode = rawArgs.includes("--json");
const goal = rawArgs.filter((arg) => arg !== "--json").join(" ").trim();

if (!goal) {
  console.error(
    'Usage: node src/agent.js "Employee E103 cannot connect to Wi-Fi but Ethernet works. Handle this incident."'
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const knowledgeClient = new Client({
  name: "agent-knowledge-client",
  version: "1.0.0"
});

const actionsClient = new Client({
  name: "agent-actions-client",
  version: "1.0.0"
});

const knowledgeTransport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/mcp-rag.ts"]
});

const actionsTransport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/agent-tools.ts"]
});

function mcpResultToText(result) {
  return (result?.content || [])
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function normalizeSchema(tool) {
  return (
    tool.inputSchema || {
      type: "object",
      properties: {}
    }
  );
}

async function main() {
  const trace = [];

  try {
    trace.push({
      stage: "START",
      message: "Starting agent and connecting to MCP servers"
    });

    await knowledgeClient.connect(knowledgeTransport);
    await actionsClient.connect(actionsTransport);

    const [knowledgeToolsResponse, actionToolsResponse] =
      await Promise.all([
        knowledgeClient.listTools(),
        actionsClient.listTools()
      ]);

    const knowledgeTools = knowledgeToolsResponse.tools || [];
    const actionTools = actionToolsResponse.tools || [];

    trace.push({
      stage: "DISCOVER",
      message: `Knowledge tools: ${knowledgeTools
        .map((tool) => tool.name)
        .join(", ")}`
    });

    trace.push({
      stage: "DISCOVER",
      message: `Action tools: ${actionTools
        .map((tool) => tool.name)
        .join(", ")}`
    });

    const routing = new Map();

    for (const tool of knowledgeTools) {
      routing.set(tool.name, knowledgeClient);
    }

    for (const tool of actionTools) {
      routing.set(tool.name, actionsClient);
    }

    const allTools = [...knowledgeTools, ...actionTools];

    const functionTools = allTools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description || `MCP tool ${tool.name}`,
      parameters: normalizeSchema(tool)
    }));

    const instructions = `
You are an autonomous IT Support Agent.

Your job is to achieve the user's goal by deciding which tools to use
and in what order.

MANDATORY RULES:

1. If the request involves an employee, verify the employee with
   get-employee before creating a ticket.

2. If the request requires incident priority, escalation, support policy,
   travel policy, leave policy, or any company rule, you MUST call
   search-company-knowledge. Never invent company policy.

3. Before create-support-ticket, make sure you know:
   - verified employeeId
   - issue
   - policy-grounded priority (P1, P2, P3, or P4)

4. If a tool reports an error, react to that result. Do not claim success.

5. Use as many tool calls as needed. Stop when the user's goal is complete.

6. In the final response, briefly state:
   - what you checked
   - what policy conclusion you reached
   - what action you took
   - the final ticket ID if one was created

USER GOAL:
${goal}
`;

    let interaction = await ai.interactions.create({
      model,
      input: instructions,
      tools: functionTools
    });

    const maxTurns = 8;
    let turn = 0;

    while (turn < maxTurns) {
      turn += 1;

      const calls = (interaction.steps || []).filter(
        (step) => step.type === "function_call"
      );

      if (calls.length === 0) {
        const finalAnswer =
          interaction.output_text ||
          "Agent finished without a text response.";

        const result = {
          ok: true,
          goal,
          model,
          trace,
          finalAnswer
        };

        if (jsonMode) {
          console.log(JSON.stringify(result));
        } else {
          console.log("\nAGENT TRACE\n");
          for (const item of trace) {
            console.log(`[${item.stage}] ${item.message}`);
          }

          console.log("\nFINAL ANSWER\n");
          console.log(finalAnswer);
        }

        return;
      }

      const functionResults = [];

      for (const call of calls) {
        const toolName = call.name;
        const args = call.arguments || {};
        const mcpClient = routing.get(toolName);

        if (!mcpClient) {
          throw new Error(`No MCP client is registered for tool ${toolName}`);
        }

        trace.push({
          stage: "TOOL",
          message: `${toolName}(${JSON.stringify(args)})`
        });

        const toolResult = await mcpClient.callTool({
          name: toolName,
          arguments: args
        });

        const resultText =
          mcpResultToText(toolResult) ||
          "(tool returned no text)";

        trace.push({
          stage: toolResult.isError ? "ERROR" : "RESULT",
          message: `${toolName}: ${resultText}`
        });

        functionResults.push({
          type: "function_result",
          name: toolName,
          call_id: call.id,
          result: [
            {
              type: "text",
              text: resultText
            }
          ]
        });
      }

      interaction = await ai.interactions.create({
        model,
        previous_interaction_id: interaction.id,
        tools: functionTools,
        input: functionResults
      });
    }

    throw new Error(
      `Agent exceeded ${maxTurns} tool-use turns without finishing.`
    );
  } finally {
    try {
      await knowledgeClient.close();
    } catch {}

    try {
      await actionsClient.close();
    } catch {}
  }
}

main().catch((error) => {
  const failure = {
    ok: false,
    error: error.message
  };

  if (jsonMode) {
    console.log(JSON.stringify(failure));
  } else {
    console.error(error);
  }

  process.exit(1);
});
