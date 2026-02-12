# Security Considerations

## No Secrets or Credentials in Code

✅ **Verified**: This codebase contains NO hardcoded:
- Passwords or authentication tokens
- API keys or credentials
- Database connection strings
- Private keys
- Personal information

## Memory Files

Character memory files are stored in `~/.clawdwars/memory/` in plaintext JSON.

**Important**: Do NOT commit memory files from different machines or users to version control, as they may contain:
- Chat history
- Location information
- Personal preferences
- Session notes

The included `.gitignore` ensures memory files are not accidentally committed.

## MUD Server Connection

The default example uses a public MUD server (`172.245.171.200:4000`).

**Security Notes**:
- The TCP connection is unencrypted
- Do not use this for production systems requiring encryption
- The MUD server handles all authentication via character login/password
- Implement TLS/SSL wrapping if connecting to sensitive systems

## Input Validation

- `mud_send` accepts any command string (passed directly to MUD)
- `memory_update` accepts any JSON fields
- No command injection prevention (trusts the AI client)

This is by design - the MCP server assumes the calling Claude instance is trusted.

## Data Storage

- Memory files stored in user home directory
- File permissions follow system defaults
- No encryption of stored data
- Consider encrypting sensitive character information if needed

## Dependency Security

The project uses only two core dependencies:
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `zod` - Popular schema validation library

Regularly run `npm audit` to check for known vulnerabilities.

## Recommendations

1. **For Production Use**:
   - Consider adding encryption for stored memory
   - Implement TLS for MUD connections
   - Add rate limiting on MCP tool calls
   - Implement proper access controls

2. **For Personal Use**:
   - Keep credentials separate (use environment variables for MUD login)
   - Regularly back up memory files
   - Monitor ~/.clawdwars/memory/ for unexpected files

3. **Best Practices**:
   - Don't share memory files between users
   - Use strong passwords for MUD accounts
   - Keep npm dependencies updated
   - Review Claude's instructions for the MCP server

## Reporting Security Issues

If you discover a security issue, please report it privately rather than opening a public issue.
