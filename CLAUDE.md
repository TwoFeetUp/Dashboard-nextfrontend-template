# AI Assistant Template Platform

This is a Next.js template project for building AI assistant platforms.

## Project Structure

```
ai-assistant-template/
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
- **AI Integration**: Pydantic ai, found in pydantic_agents

### Windows Development Issues

If Next.js gets stuck on "Starting":
1. Use `netstat` to find the process
2. Kill with `taskkill //F` (use double slash)
3. Delete `.next` folder
4. Start again

### Important Notes

- Avoid emojis in logs to prevent Unicode issues on Windows
- DO NOT USE Vercel's proprietary AI SDK plugins - use OpenAI-compatible endpoints instead 