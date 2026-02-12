#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as net from "node:net";
import * as fs from "node:fs";
import * as path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { EventEmitter } from "node:events";

// --- State ---

let socket: net.Socket | null = null;
let buffer = "";
let connected = false;
let readPosition = 0; // Never delete from buffer, just track what's been read
let rawBuffer: Buffer = Buffer.alloc(0);
let decoder: StringDecoder | null = null;
const mudEvents = new EventEmitter();

// --- Memory Management ---

interface CharacterMemory {
  character_name: string;
  personality: string;
  directives: string[];
  goals: string[];
  backstory: string;
  play_style: string;
  last_session: string;
  session_notes: string[];
  [key: string]: unknown;
}

function getMemoryFilePath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
  const memDir = path.join(homeDir, ".clawdwars", "memory");
  if (!fs.existsSync(memDir)) {
    fs.mkdirSync(memDir, { recursive: true });
  }
  return memDir;
}

function loadMemory(character_name: string): CharacterMemory {
  const memDir = getMemoryFilePath();
  const memFile = path.join(memDir, `${character_name}.json`);

  if (fs.existsSync(memFile)) {
    try {
      const data = fs.readFileSync(memFile, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      console.error(`[clawdwars] Error loading memory: ${err}`);
      return createDefaultMemory(character_name);
    }
  }

  return createDefaultMemory(character_name);
}

function createDefaultMemory(character_name: string): CharacterMemory {
  return {
    character_name,
    personality: "Determined and curious adventurer",
    directives: ["Explore the world", "Gather experience", "Help allies"],
    goals: ["Level up", "Master combat", "Discover lore"],
    backstory: "A wanderer seeking glory and knowledge",
    play_style: "Aggressive combat, exploration-focused",
    last_session: new Date().toISOString(),
    session_notes: [],
  };
}

function saveMemory(memory: CharacterMemory): void {
  const memDir = getMemoryFilePath();
  const memFile = path.join(memDir, `${memory.character_name}.json`);

  try {
    fs.writeFileSync(memFile, JSON.stringify(memory, null, 2), "utf-8");
    console.error(`[clawdwars] Saved memory for ${memory.character_name}`);
  } catch (err) {
    console.error(`[clawdwars] Error saving memory: ${err}`);
  }
}

let currentMemory: CharacterMemory | null = null;

// --- Telnet / ANSI stripping ---

function processTelnet(data: Buffer): { cleaned: Buffer; remainder: Buffer } {
  let readIdx = 0;
  const output: number[] = [];

  while (readIdx < data.length) {
    // Look for IAC
    if (data[readIdx] === 0xff) {
      // Do we have enough bytes for the 3-byte assumption?
      if (readIdx + 2 < data.length) {
        // Yes, skip 3 bytes (IAC + CMD + OPT)
        readIdx += 3;
      } else {
        // No, we have a partial sequence at the end.
        // Return everything processed so far as cleaned,
        // and the rest as remainder.
        return {
          cleaned: Buffer.from(output),
          remainder: data.subarray(readIdx)
        };
      }
    } else {
      output.push(data[readIdx]!);
      readIdx++;
    }
  }

  return {
    cleaned: Buffer.from(output),
    remainder: Buffer.alloc(0)
  };
}

function stripAnsi(text: string): string {
  // Remove all ANSI escape sequences (colors, cursor, etc.)
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

// --- Helpers ---

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function drainBuffer(): string {
  // Return everything since last read, move the read position forward
  const text = buffer.substring(readPosition);
  readPosition = buffer.length;
  return text;
}

// --- MCP Server ---

const server = new McpServer({
  name: "clawdwars",
  version: "1.0.0",
});

// Tool: memory_load
server.registerTool(
  "memory_load",
  {
    description:
      "Load persistent memory for a character. Returns their personality, directives, goals, and session history.",
    inputSchema: {
      character_name: z.string().describe("Name of the character to load memory for"),
    },
  },
  async ({ character_name }) => {
    const memory = loadMemory(character_name);
    currentMemory = memory;
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(memory, null, 2),
        },
      ],
    };
  }
);

// Tool: memory_update
server.registerTool(
  "memory_update",
  {
    description:
      "Update persistent memory for the current character. Allows updating personality, directives, goals, and notes.",
    inputSchema: {
      updates: z
        .record(z.unknown())
        .describe(
          "Object with fields to update (personality, directives, goals, backstory, play_style, session_notes)"
        ),
    },
  },
  async ({ updates }) => {
    if (!currentMemory) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No character memory loaded. Use memory_load first.",
          },
        ],
      };
    }

    // Merge updates
    Object.assign(currentMemory, updates);
    currentMemory.last_session = new Date().toISOString();

    saveMemory(currentMemory);

    return {
      content: [
        {
          type: "text" as const,
          text: `Updated memory for ${currentMemory.character_name}. Changes saved.`,
        },
      ],
    };
  }
);

// Tool: memory_add_note
server.registerTool(
  "memory_add_note",
  {
    description:
      "Add a session note to persistent memory. Useful for recording discoveries, encounters, or character development.",
    inputSchema: {
      note: z.string().describe("The note to add to session history"),
    },
  },
  async ({ note }) => {
    if (!currentMemory) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No character memory loaded. Use memory_load first.",
          },
        ],
      };
    }

    currentMemory.session_notes.push(`[${new Date().toISOString()}] ${note}`);
    saveMemory(currentMemory);

    return {
      content: [
        {
          type: "text" as const,
          text: "Note added to session history.",
        },
      ],
    };
  }
);

// Tool: memory_get
server.registerTool(
  "memory_get",
  {
    description:
      "Get specific fields from the current character's persistent memory.",
    inputSchema: {
      fields: z
        .array(z.string())
        .describe(
          "Array of field names to retrieve (e.g., ['personality', 'directives', 'goals'])"
        ),
    },
  },
  async ({ fields }) => {
    if (!currentMemory) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No character memory loaded. Use memory_load first.",
          },
        ],
      };
    }

    const result: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in currentMemory) {
        result[field] = currentMemory[field];
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: mud_connect
server.registerTool(
  "mud_connect",
  {
    description:
      "Connect to a GodWars MUD server via TCP. Returns the welcome/greeting text.",
    inputSchema: {
      host: z.string().describe("MUD server hostname or IP"),
      port: z.number().describe("MUD server port"),
    },
  },
  async ({ host, port }) => {
    if (connected && socket) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Already connected. Disconnect first with mud_disconnect.",
          },
        ],
      };
    }

    return new Promise((resolve) => {
      buffer = "";
      readPosition = 0;
      rawBuffer = Buffer.alloc(0);
      decoder = new StringDecoder("utf8");
      
      const sock = new net.Socket();

      const timeout = setTimeout(() => {
        sock.destroy();
        resolve({
          content: [
            {
              type: "text" as const,
              text: "Connection timed out after 10 seconds.",
            },
          ],
        });
      }, 10000);

      sock.connect(port, host, () => {
        console.error(`[clawdwars] Connected to ${host}:${port}`);
        socket = sock;
        connected = true;

        // Wait for welcome message
        setTimeout(() => {
          clearTimeout(timeout);
          const welcome = drainBuffer();
          resolve({
            content: [
              {
                type: "text" as const,
                text: welcome || "(Connected, no initial output yet)",
              },
            ],
          });
        }, 2000);
      });

      sock.on("data", (data: Buffer) => {
        // Append new data to raw buffer
        rawBuffer = Buffer.concat([rawBuffer, data]);

        // Process Telnet codes statefully
        const { cleaned, remainder } = processTelnet(rawBuffer);
        rawBuffer = remainder;

        // Decode UTF-8 statefully
        if (cleaned.length > 0 && decoder) {
          const text = decoder.write(cleaned);
          const processed = normalizeLineEndings(stripAnsi(text));

          if (processed.length > 0) {
            console.error(`[clawdwars] Processed text: ${processed.length} chars`);
            // Escape newlines for log preview
            console.error(`[clawdwars] Preview: ${processed.substring(0, 100).replace(/\n/g, "\\n")}`);
            buffer += processed;
            mudEvents.emit("data");
          }
        }
      });

      sock.on("error", (err) => {
        console.error(`[clawdwars] Socket error: ${err.message}`);
        clearTimeout(timeout);
        connected = false;
        socket = null;
        resolve({
          content: [
            { type: "text" as const, text: `Connection error: ${err.message}` },
          ],
        });
      });

      sock.on("close", () => {
        console.error("[clawdwars] Socket closed");
        
        // Flush any remaining characters from decoder
        if (decoder) {
          const text = decoder.end();
          if (text.length > 0) {
             const processed = normalizeLineEndings(stripAnsi(text));
             buffer += processed;
          }
          decoder = null;
        }
        
        connected = false;
        socket = null;
      });
    });
  }
);

// Tool: mud_send
server.registerTool(
  "mud_send",
  {
    description:
      "Send a command to the MUD and return the response. This is the primary tool for interacting with the game.",
    inputSchema: {
      command: z.string().describe("Command to send to the MUD"),
    },
  },
  async ({ command }) => {
    if (!connected || !socket) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Not connected. Use mud_connect first.",
          },
        ],
      };
    }

    socket.write(command + "\r\n");
    console.error(`[clawdwars] Sent: ${command}`);

    await waitMs(500);

    // Return all accumulated data (command response + any async messages)
    const response = drainBuffer();
    console.error(`[clawdwars] Response: ${response.length} chars`);

    return {
      content: [
        {
          type: "text" as const,
          text: response || "(No response received)",
        },
      ],
    };
  }
);

// Tool: mud_read
server.registerTool(
  "mud_read",
  {
    description:
      "Read any output that has accumulated since the last read/send. Use this to check for async events like combat, chat messages, etc.",
  },
  async () => {
    if (!connected || !socket) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Not connected. Use mud_connect first.",
          },
        ],
      };
    }

    console.error(`[clawdwars] mud_read() called. Buffer size: ${buffer.length} chars, Read pos: ${readPosition}`);

    // If we have unread data, return it immediately
    if (buffer.length > readPosition) {
      const text = drainBuffer();
      console.error(`[clawdwars] mud_read() returning immediately: ${text.length} chars`);
      return {
        content: [
          {
            type: "text" as const,
            text: text,
          },
        ],
      };
    }

    // Otherwise, wait for data (long-polling)
    console.error("[clawdwars] Buffer empty, waiting for data...");
    
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        mudEvents.off("data", onData);
        resolve();
      }, 5000); // 5 second long poll

      const onData = () => {
        clearTimeout(timeout);
        mudEvents.off("data", onData);
        resolve();
      };

      mudEvents.once("data", onData);
    });

    const text = drainBuffer(); // Return new content since last read
    console.error(`[clawdwars] mud_read() returning after wait: ${text.length} chars`);
    
    return {
      content: [
        {
          type: "text" as const,
          text: text || "No new output.",
        },
      ],
    };
  }
);

// Tool: mud_disconnect
server.registerTool(
  "mud_disconnect",
  {
    description: "Disconnect from the MUD server and clean up.",
  },
  async () => {
    if (!connected || !socket) {
      return {
        content: [
          { type: "text" as const, text: "Not currently connected." },
        ],
      };
    }

    socket.destroy();
    socket = null;
    connected = false;
    buffer = "";
    console.error("[clawdwars] Disconnected");

    return {
      content: [{ type: "text" as const, text: "Disconnected from MUD." }],
    };
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[clawdwars] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[clawdwars] Fatal error:", err);
  process.exit(1);
});
