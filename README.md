# Clawdwars MCP Server

An MCP (Model Context Protocol) server that enables Claude and other AI models to autonomously play GodWars MUD with persistent personality and memory.

## Features

### Core MUD Interaction
- **mud_connect**: Establish TCP connection to GodWars MUD server
- **mud_send**: Send commands and receive responses from the MUD
- **mud_read**: Check for asynchronous events (combat, chat, etc.)
- **mud_disconnect**: Cleanly close connection and cleanup

### Persistent AI Memory System
- **memory_load**: Load character personality, directives, goals, backstory, and session history
- **memory_update**: Update any aspect of a character's persistent data
- **memory_add_note**: Record session notes, discoveries, and character development
- **memory_get**: Retrieve specific memory fields for decision-making

## Installation

```bash
cd clawdwars
npm install
npm run build
```

## Usage

### Auto-discovery via .mcp.json

Add to your Claude Code configuration (`~/.claude/config.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "clawdwars": {
      "command": "node",
      "args": ["clawdwars/build/index.js"]
    }
  }
}
```

### Programmatic Usage

The MCP server exposes all tools via the MCP protocol on stdio:

```javascript
// Example: Load character memory
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/callTool",
  "params": {
    "name": "memory_load",
    "arguments": { "character_name": "YourCharacter" }
  }
}

// Example: Connect to MUD
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/callTool",
  "params": {
    "name": "mud_connect",
    "arguments": {
      "host": "172.245.171.200",
      "port": 4000
    }
  }
}
```

## Memory System Architecture

Character memory is stored as JSON in `~/.clawdwars/memory/` with one file per character:

```json
{
  "character_name": "Clawdnerf",
  "personality": "Determined werewolf warrior",
  "directives": [
    "Pursue combat excellence",
    "Protect allies",
    "Explore dangerous dungeons"
  ],
  "goals": [
    "Achieve high level",
    "Master dual-wielding",
    "Discover hidden treasure"
  ],
  "backstory": "A cursed wanderer seeking redemption through battle",
  "play_style": "Aggressive offense, minimal defense",
  "last_session": "2026-02-12T15:30:00Z",
  "session_notes": [
    "[2026-02-12T15:30:00Z] Defeated the blob easily at level 1",
    "[2026-02-12T15:35:00Z] Discovered energy drain spell is effective"
  ]
}
```

## MUD Configuration

The server connects to GodWars MUD at `172.245.171.200:4000` by default. Customize by passing different host/port to `mud_connect`.

## Protocol Details

### Output Cleaning
- Telnet IAC sequences stripped (Telnet negotiation)
- ANSI color codes removed (for clean text)
- Line endings normalized to `\n`
- UTF-8 encoded

### Response Buffering
- mud_send waits 500ms for response (MUD uses tick-based timing)
- Output accumulated in buffer between commands
- mud_read retrieves buffered output without sending commands
- Ideal for checking for async events during long operations

## AI Player Example

When Claude Code has access to this server, an AI player can:

1. **Load memory** to understand their character's personality and goals
2. **Connect to MUD** and create/login to character
3. **Autonomously explore** and fight, informed by their directives
4. **Update memory** as they discover new strategies or lore
5. **Add notes** to record important discoveries for future sessions

The AI maintains consistent personality across sessions via the persistent memory system.

## Development

### Build
```bash
npm run build
```

### Debug
Enable debug logging by checking stderr:
```bash
node build/index.js 2>&1
```

## License

MIT

## Contributing

Contributions welcome! Fork and submit PRs for bug fixes, new features, or improvements to the memory system.
