# MCP (Model Context Protocol) 서버 레퍼런스

## MCP란?

Claude Code가 외부 도구/데이터 소스와 통합하기 위한 프로토콜.
MCP 서버를 등록하면 Claude가 해당 서버의 도구를 사용할 수 있음.

## 설정 위치

```json
// ~/.claude/settings.json (글로벌)
// <project>/.claude/settings.json (프로젝트별)
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-xxx"],
      "env": {}
    }
  }
}
```

## 유용한 공식/커뮤니티 MCP 서버

### 파일시스템
```json
"filesystem": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
}
```

### GitHub
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx" }
}
```

### Slack
```json
"slack": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-slack"],
  "env": { "SLACK_BOT_TOKEN": "xoxb-xxx" }
}
```

### PostgreSQL
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://..."]
}
```

### Brave Search
```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": { "BRAVE_API_KEY": "xxx" }
}
```

### Puppeteer (브라우저)
```json
"puppeteer": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
}
```

### Sequential Thinking
```json
"sequential-thinking": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
}
```

## 커스텀 MCP 서버 만들기

Python (fastmcp):
```python
from fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
def my_tool(param: str) -> str:
    """도구 설명"""
    return f"결과: {param}"

mcp.run()
```

설정:
```json
"my-server": {
  "command": "python",
  "args": ["/path/to/server.py"]
}
```

TypeScript:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "my-server", version: "1.0.0" });

server.tool("my_tool", { param: z.string() }, async ({ param }) => ({
  content: [{ type: "text", text: `결과: ${param}` }]
}));

const transport = new StdioServerTransport();
await server.connect(transport);
```

## MCP 디버깅

```bash
# MCP 서버 상태 확인
claude /mcp

# 서버 로그 확인
claude --verbose  # MCP 관련 로그 포함
```

## 주요 리소스

- 공식 서버 목록: https://github.com/modelcontextprotocol/servers
- MCP 스펙: https://spec.modelcontextprotocol.io
- Python SDK: https://github.com/modelcontextprotocol/python-sdk
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
