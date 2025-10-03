# Olympisch Stadion AI Assistant Platform

This project is for Olympisch stadion, who want a few AI assistants.

## Project Structure

```
olympisch/
├── src/                         # Main source code directory
│   ├── app/                     # Next.js app router directory
│   │   ├── api/                 # API routes for backend functionality
│   │   │   └── chat/            # Chat API endpoint with Mistral integration
│   │   │       └── route.ts     # Handles chat requests, message streaming
│   │   ├── globals.css          # Global styles and Tailwind CSS imports
│   │   ├── layout.tsx           # Root layout with providers and metadata
│   │   └── page.tsx             # Main chat interface page component
│   ├── components/              # React component library
│   │   ├── ui/                  # shadcn/ui reusable components
│   │   │   ├── button.tsx       # Button component with variants
│   │   │   ├── card.tsx         # Card container components
│   │   │   ├── dropdown-menu.tsx # Dropdown menu with Radix UI
│   │   │   ├── input.tsx        # Form input component
│   │   │   ├── label.tsx        # Form label component
│   │   │   └── scroll-area.tsx  # Scrollable area component
│   │   ├── chat-interface.tsx   # Main chat UI with message handling
│   │   └── memoized-markdown.tsx # Optimized markdown renderer with tables
│   ├── hooks/                   # Custom React hooks
│   │   └── use-auth.ts          # Authentication hook for PocketBase
│   ├── lib/                     # Core utilities and integrations
│   │   ├── conversation.ts      # Conversation management logic
│   │   ├── mistral.ts           # Mistral AI API client setup
│   │   ├── pocketbase.ts        # PocketBase client configuration
│   │   └── utils.ts             # Utility functions (e.g., cn)
│   ├── providers/               # React context providers
│   │   └── auth-provider.tsx    # Authentication context and provider
│   └── types/                   # TypeScript type definitions
│       └── auth.ts              # Authentication related types
├── docs/                        # Documentation and references
│   ├── prompts/                 # AI prompt templates directory
│   ├── mcp.md                   # MCP server documentation
│   ├── pbmcp.md                 # PocketBase MCP documentation
│   └── system-prompt-general.md # System prompt configuration
├── playground/                  # Experimental code and testing
│   ├── pocketbase-tests/        # PocketBase integration tests
│   ├── test-auth-integration.md # Auth integration test docs
│   └── test-markdown.md         # Markdown rendering tests
├── pocketbase-mcp/              # PocketBase MCP server package
│   ├── src/                     # MCP server source code
│   ├── build/                   # Compiled MCP server code
│   └── README.md                # MCP server documentation
├── .env                         # Environment variables (ignored)
├── .env.local                   # Local environment overrides
├── .env.local.example           # Environment variable template
├── components.json              # shadcn/ui configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Project dependencies and scripts
└── next.config.js               # Next.js configuration
```

## Tech Stack

- **Frontend**: shadcn/ui components (install with: `npx shadcn@latest add "https://v0.app/chat/b/b_4SvqqVrbvxZ"`)
- **Authentication**: PocketBase for login system
- **AI Integration**: Vercel AI SDK with OpenAI-compatible endpoints (NOT Vercel's proprietary)
- **AI Model**: Mistral-medium-latest
- **Development**: Claude Code

## Key Features

- Conversations are scoped per user
- Message history is retained
- Real-time streaming responses

## Mistral API Example

```bash
curl https://api.mistral.ai/v1/conversations \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $MISTRAL_API_KEY" \
  -d '{
    "model": "mistral-medium-latest",
    "inputs": [
      {"role": "user", "content": "Hello!"}
    ],
    "tools": [],
    "completion_args": {
      "temperature": 0.7,
      "max_tokens": 2048,
      "top_p": 1
    },
    "stream": true,
    "instructions": "You are a helpful assistant"
  }'
```

## Development Guidelines

### Documentation
- Use context7 to fetch recent documentation for PocketBase, Vercel AI SDK, shadcn, etc.

### Database Management
- Use the pocketbase-mcp to access PocketBase and make edits to collections
- Auth info is in .env

### Parallel Agents

When calling parallel agents, use this pattern:
```
[call 1: agent 1, agent 2, agent 3]  # ✓ Spawns in parallel
```

NOT this:
```
[call 1: agent 1]
[call 2: agent 2]  # ✗ Sequential, not parallel
```

### Windows Development Issues

If Next.js gets stuck on "Starting":
1. Use `netstat` to find the process
2. Kill with `taskkill //F` (use double slash)
3. Delete `.next` folder
4. Start again

### Important Notes

- Avoid emojis in logs to prevent Unicode issues on Windows
- DO NOT USE Vercel's proprietary AI SDK plugins - use OpenAI-compatible endpoints instead 