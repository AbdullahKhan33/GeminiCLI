import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

type Employee = {
  name: string;
  department: string;
  location: string;
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
    name: "enterprise-actions",
    version: "1.0.0"
  });

  server.registerTool(
    "get-employee",
    {
      description:
        "Retrieve employee information using an employee ID. Use this before creating a support ticket.",
      inputSchema: z.object({
        employeeId: z
          .string()
          .regex(/^E\d{3}$/, "Employee ID must look like E101")
      })
    },
    async ({ employeeId }) => {
      const employee = employees[employeeId.toUpperCase()];

      if (!employee) {
        return {
          content: [
            {
              type: "text",
              text: `Employee ${employeeId} was not found.`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                employeeId: employeeId.toUpperCase(),
                ...employee
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  server.registerTool(
    "create-support-ticket",
    {
      description:
        "Create a support ticket for a verified employee. Priority must come from company support policy, not from guessing.",
      inputSchema: z.object({
        employeeId: z
          .string()
          .regex(/^E\d{3}$/, "Employee ID must look like E101"),
        issue: z
          .string()
          .min(10, "Issue must be at least 10 characters"),
        priority: z.enum(["P1", "P2", "P3", "P4"])
      })
    },
    async ({ employeeId, issue, priority }) => {
      const employee = employees[employeeId.toUpperCase()];

      if (!employee) {
        return {
          content: [
            {
              type: "text",
              text: `Ticket was not created because employee ${employeeId} does not exist.`
            }
          ],
          isError: true
        };
      }

      const ticket = {
        ticketId: `INC-${ticketNumber++}`,
        employeeId: employeeId.toUpperCase(),
        employeeName: employee.name,
        issue,
        priority,
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

  return server;
}

console.error("Enterprise Actions MCP server running");
console.error("Tools: get-employee, create-support-ticket");

void serveStdio(createServer);
