import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";


type InventoryItem = {
  product: string;
  quantity: number;
  location: string;
};

type Employee = {
  name: string;
  department: string;
  location: string;
};


const inventory: Record<string, InventoryItem> = {

  "LAPTOP-101": {
    product: "Dell Latitude 7450",
    quantity: 12,
    location: "Hyderabad Warehouse"
  },

  "MONITOR-201": {
    product: "Dell 27-inch Monitor",
    quantity: 4,
    location: "Bengaluru Warehouse"
  },

  "KEYBOARD-301": {
    product: "Logitech MX Keys",
    quantity: 0,
    location: "Hyderabad Warehouse"
  }

};


const employees: Record<string, Employee> = {

  E101: {
    name: "Anil Kumar",
    department: "Engineering",
    location: "Hyderabad"
  },

  E102: {
    name: "Sarah Joseph",
    department: "Finance",
    location: "Bengaluru"
  },

  E103: {
    name: "Rahul Mehta",
    department: "Support",
    location: "Pune"
  }

};


let ticketNumber = 1001;


function createServer() {

  const server = new McpServer({
    name: "enterprise-tools",
    version: "1.0.0"
  });


  server.registerTool(

    "check-inventory",

    {
      description:
        "Check product inventory using a product code",

      inputSchema: z.object({
        productCode: z.string()
      })
    },

    async ({ productCode }) => {

      const item =
        inventory[productCode.toUpperCase()];

      if (!item) {

        return {
          content: [
            {
              type: "text",
              text: `Product ${productCode} was not found.`
            }
          ]
        };

      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(item, null, 2)
          }
        ]
      };

    }

  );


  server.registerTool(

    "get-employee",

    {
      description:
        "Retrieve employee information using employee ID",

      inputSchema: z.object({
        employeeId: z.string()
      })
    },

    async ({ employeeId }) => {

      const employee =
        employees[employeeId.toUpperCase()];

      if (!employee) {

        return {
          content: [
            {
              type: "text",
              text: `Employee ${employeeId} was not found.`
            }
          ]
        };

      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(employee, null, 2)
          }
        ]
      };

    }

  );


  server.registerTool(
  "create-support-ticket",
  {
    description: `
      Create a support ticket for an employee.

      The employeeId and issue must be explicitly provided.
      Never invent missing information.
    `,

    inputSchema: z.object({
      employeeId: z
        .string()
        .regex(
          /^E\d{3}$/,
          "Employee ID must be in the format E101"
        )
        .describe(
          "Employee ID explicitly provided by the user, for example E101"
        ),

      issue: z
        .string()
        .min(
          10,
          "Issue must contain at least 10 characters"
        )
        .describe(
          "Description of the issue explicitly provided by the user"
        )
    })
  },

  async ({ employeeId, issue }) => {

    const ticket = {
      ticketId: `INC-${ticketNumber++}`,
      employeeId,
      issue,
      status: "OPEN"
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(ticket, null, 2)
        }
      ]
    };

  }
);

  server.registerResource(

  "support-policy",

  "company://policies/support",

  {
    title: "Company Support Policy",

    description:
      "Internal policy describing support ticket priorities and escalation rules",

    mimeType: "text/plain"
  },

    async (uri) => {

      const policy = `
  COMPANY SUPPORT POLICY

  Priority Levels

  P1 - Critical
  - Complete business outage
  - Security incident
  - Production system unavailable
  - Immediate escalation required

  P2 - High
  - Major feature unavailable
  - Multiple users affected
  - Significant business impact
  - Escalate within 30 minutes

  P3 - Medium
  - Individual user issue
  - Workaround available
  - Normal support queue

  P4 - Low
  - General request
  - Information request
  - Cosmetic issue

  Escalation Rules

  1. P1 incidents must be escalated immediately.
  2. P2 incidents must be assigned to the engineering team.
  3. P3 incidents are handled by the support team.
  4. P4 requests are handled during normal business hours.
  `;

    return {

      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: policy
        }
      ]

    };

  }

);

  return server;

}


void serveStdio(createServer);

console.error(
  "Enterprise MCP server running"
);