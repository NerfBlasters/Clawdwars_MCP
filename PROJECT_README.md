# Clawdwars MCP

An MCP (Model Context Protocol) server that enables Claude and other AI models to autonomously play **GodWars MUD** with persistent personality, memory, and goals.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## What is Clawdwars?

Clawdwars allows you to:

- 🎮 **Play GodWars MUD** - Connect Claude directly to the game via TCP
- 🧠 **Persistent Memory** - Each AI character remembers personality, goals, and session history
- 🤖 **Autonomous Gameplay** - AI makes decisions informed by character directives
- 📝 **Session Tracking** - Automatic note-taking and discovery recording
- 🔄 **Cross-Session Continuity** - Characters evolve and develop over time

## Quick Start

### 1. Install

```bash
git clone https://github.com/yourusername/Clawdwars_MCP.git
cd Clawdwars_MCP
npm install
npm run build
```

### 2. Configure

Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "clawdwars": {
      "command": "node",
      "args": ["/path/to/Clawdwars_MCP/build/index.js"]
    }
  }
}
```

### 3. Play

```
Human: Connect to the GodWars MUD and play as a werewolf warrior.
Claude: I'll load my character memory and connect to the game...
[Claude autonomously plays, making decisions based on character personality]
```

## Tools

### MUD Interaction
- `mud_connect(host, port)` - Connect to MUD server
- `mud_send(command)` - Send commands to MUD
- `mud_read()` - Check for async events
- `mud_disconnect()` - Close connection

### Character Memory
- `memory_load(character_name)` - Load character personality & goals
- `memory_update(updates)` - Update character traits
- `memory_add_note(note)` - Record discoveries
- `memory_get(fields)` - Retrieve specific memory

## Example Character Memory

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
  "backstory": "A cursed wanderer seeking redemption",
  "play_style": "Aggressive offense, minimal defense",
  "session_notes": [
    "[2026-02-12] Discovered energy drain spell",
    "[2026-02-13] Reached level 5, unlocked warrior abilities"
  ]
}
```

## How It Works

1. **AI loads memory** - Character personality and directives inform decisions
2. **Connect to MUD** - TCP connection to game server
3. **Play autonomously** - Claude explores, fights, and levels based on directives
4. **Update memory** - Discoveries and decisions recorded for future sessions
5. **Persistent growth** - Character develops personality over time

## Memory Storage

Character memories are stored locally in `~/.clawdwars/memory/` as JSON files. This allows:
- Consistent AI personality across sessions
- Automatic decision-making informed by character traits
- Session history tracking
- Custom goals and backstories

## Configuration

### Default MUD
- **Server**: 172.245.171.200
- **Port**: 4000
- **Game**: GodWars MUD

Connect to any MUD-compatible server by passing different host/port to `mud_connect()`.

## Features

- ✅ Raw TCP socket management
- ✅ Telnet protocol handling (IAC stripping)
- ✅ ANSI color code removal
- ✅ Output buffering with configurable wait time
- ✅ Persistent character memory
- ✅ Session tracking with timestamps
- ✅ No hardcoded secrets
- ✅ Full TypeScript support

## Documentation

- [README.md](./README.md) - Usage guide
- [SECURITY.md](./SECURITY.md) - Security considerations
- [CONTRIBUTING.md](./.github/CONTRIBUTING.md) - How to contribute

## Use Cases

### Educational
- Learn about MUDs and interactive fiction
- Study AI decision-making in game environments
- Explore persistent memory systems

### Entertainment
- Watch AI play through classic MUDs
- Create unique AI player personalities
- Build AI companions with long-term goals

### Research
- Study AI autonomy in dynamic environments
- Test decision-making strategies
- Experiment with persistent memory architectures

## Requirements

- Node.js 18+
- npm or yarn
- Access to a MUD server (default: GodWars at 172.245.171.200:4000)

## Architecture

```
Clawdwars MCP Server
├── MCP Protocol (stdio)
│   ├── Memory Tools (4x)
│   └── MUD Tools (4x)
├── Character Memory (JSON files)
├── TCP Socket (to MUD)
└── Protocol Handlers
    ├── Telnet IAC stripping
    ├── ANSI code removal
    └── Output buffering
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for guidelines.

Ideas for contribution:
- Additional memory fields (skills, inventory, faction reputation)
- Support for more MUD servers
- AI decision-making improvements
- Memory encryption options
- Web UI for memory management
- Discord/Slack integration for session updates

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Acknowledgments

- GodWars MUD community
- Model Context Protocol (MCP) specification
- Claude AI for autonomous gameplay

## Contact & Support

- Open an issue for bugs
- Start a discussion for ideas
- Check existing issues before posting

---

**Ready to create an AI player?** Fork this repo and start building!
