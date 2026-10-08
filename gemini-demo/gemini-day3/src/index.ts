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


  // -------------------------------
  // TOOL 1 - Inventory
  // -------------------------------

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
              text:
                `Product ${productCode} was not found.`
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


  // -------------------------------
  // TOOL 2 - Employee Lookup
  // -------------------------------

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
              text:
                `Employee ${employeeId} was not found.`
            }
          ]
        };

      }


      return {
        content: [
          {
            type: "text",
            text:
              JSON.stringify(employee, null, 2)
          }
        ]
      };

    }

  );


  // -------------------------------
  // TOOL 3 - Support Ticket
  // -------------------------------

  server.registerTool(

    "create-support-ticket",

    {
      description:
        "Create a support ticket for an employee",

      inputSchema: z.object({

        employeeId: z.string(),

        issue: z.string()

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
            text:
              JSON.stringify(ticket, null, 2)
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