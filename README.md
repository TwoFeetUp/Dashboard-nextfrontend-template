# AI Assistant Frontend Template

A production-ready Next.js template for building AI assistant applications with Pydantic AI agents, PocketBase authentication, and streaming responses.

## Features

- **AI Agent Integration** - Connect to Pydantic AI agents via REST API with streaming support
- **PocketBase Authentication** - Built-in user authentication and data persistence
- **Conversation Management** - Save and manage chat conversations per user
- **OCR Capabilities** - Extract text from PDFs, images, and documents using Mistral AI
- **Real-time Streaming** - Progressive response rendering with Server-Sent Events
- **Function Call Visualization** - Optional UI to show agent tool usage
- **Responsive Design** - Mobile-friendly chat interface with shadcn/ui components
- **Type-Safe** - Full TypeScript support throughout

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.12+ (for agent backend)
- PocketBase instance (local or remote)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - See [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) for complete setup guide

## Tech Stack

### Frontend
- **Next.js 15.5.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality React components
- **PocketBase SDK** - Database and authentication client

### Backend Integration
- **Pydantic AI** - Python agent framework (separate backend)
- **FastAPI** - Python web framework for agent server
- **Mistral AI** - OCR and optional LLM provider
- **PocketBase** - SQLite-based backend with real-time subscriptions

## Project Structure

```
nextjs-frontend-template/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/           # Proxy to Python agent backend
│   │   │   ├── chat/            # Direct Mistral chat (optional)
│   │   │   └── ocr/             # OCR endpoint
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx             # Main chat interface
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── branding/            # Logo and branding
│   │   ├── chat-interface.tsx   # Main chat UI
│   │   └── memoized-markdown.tsx
│   ├── hooks/
│   │   └── use-auth.ts          # PocketBase auth hook
│   ├── lib/
│   │   ├── agent-config.ts      # Agent backend toggle
│   │   ├── conversation.ts      # Conversation management
│   │   ├── pocketbase.ts        # PocketBase client
│   │   ├── pocketbase-admin.ts  # Admin operations
│   │   └── mistral.ts           # Mistral AI client
│   ├── prompts/                 # AI prompt templates
│   └── types/                   # TypeScript definitions
├── .env.example                 # Environment template
├── .env.local                   # Your configuration (git-ignored)
├── TEMPLATE_SETUP.md            # Customization guide
├── CLAUDE.md                    # Development guidelines
└── package.json
```

## Environment Configuration

### Required Variables

Create `.env.local` with:

```bash
# PocketBase Configuration
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase.com
POCKETBASE_ADMIN_EMAIL=admin@company.com
POCKETBASE_ADMIN_PASSWORD=your_password

# Agent Backend
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_AGENT_BACKEND=true

# Optional: Direct Mistral Usage
MISTRAL_API_KEY=your_mistral_key

# App Configuration
NEXT_PUBLIC_APP_NAME=AI Assistant
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_FUNCTION_VISUALIZATION=true
```

See [.env.example](./.env.example) for complete documentation.

## Agent Backend Setup

This template connects to a separate Python agent backend. To set it up:

1. **Install Python dependencies:**
   ```bash
   cd ..
   pip install -r requirements.txt
   pip install -e ./pydantic-agents-core
   ```

2. **Configure agent environment:**
   ```bash
   # Create .env in project root
   DEEPINFRA_API_KEY=your_key
   MY_AGENT_MCP_URL=https://mcp.context7.com/mcp
   ```

3. **Start agent server:**
   ```bash
   python -m pydantic_agents.server
   # Runs on http://localhost:8000
   ```

## PocketBase Setup

### Required Collections

The template needs these PocketBase collections:

1. **users** (auth collection) - Built-in
2. **conversations** - Chat conversation metadata
3. **messages** - Individual chat messages

### Auto-Setup (Recommended)

```bash
# From project root
python create_collections.py
```

### Manual Setup

See [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md#pocketbase-setup) for detailed instructions.

## Development

### Running Locally

```bash
# Terminal 1: Start agent backend (from project root)
python -m pydantic_agents.server

# Terminal 2: Start Next.js frontend
cd nextjs-frontend-template
npm run dev
```

### Testing Integration

```bash
# From project root
python test_integration.py
```

Expected output:
```
[OK] Agent backend is running
[OK] Agent responded
[OK] PocketBase is healthy and connected
[OK] Next.js proxy is working
```

### Building for Production

```bash
npm run build
npm start
```

## Customization

See [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) for complete customization guide including:

- Branding and styling
- Agent system prompts
- Custom tools and capabilities
- Environment configuration
- Deployment options

## Key Features

### Agent Backend Toggle

Switch between direct Mistral API and Pydantic AI agent backend:

```typescript
// src/lib/agent-config.ts
NEXT_PUBLIC_USE_AGENT_BACKEND=true   // Use Python agent
NEXT_PUBLIC_USE_AGENT_BACKEND=false  // Use direct Mistral
```

### OCR Support

Extract text from files:

```typescript
// Supports: PDF, images (PNG/JPG), DOCX, TXT, MD
POST /api/ocr
Content-Type: multipart/form-data
file: [your-file]
```

### Streaming Responses

Real-time response rendering with SSE:

```typescript
// Backend endpoint for streaming
POST /chat/stream
```

## Documentation

- [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) - Complete customization guide
- [CLAUDE.md](./CLAUDE.md) - Development guidelines and architecture
- [.env.example](./.env.example) - Environment variable documentation

## Architecture

### Multi-Agent System

The template uses a **multi-agent architecture** where each tool has its own dedicated AI agent:

```
                                    Frontend (Next.js :3000)
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
            Tool Selection          /api/agent Proxy        PocketBase
         (assistantType param)    (Routes to correct       (Conversations
                                      agent)                & Messages)
                                            │
        ┌───────────────────────────────────┼───────────────────────────────┐
        │                                   │                               │
        │           Agent Backend (FastAPI :8000)                           │
        │                                   │                               │
        │    ┌──────────────────────────────┴────────────────────────┐     │
        │    │              AgentRegistry (Router)                    │     │
        │    │   Maps assistantType → Correct Agent Instance         │     │
        │    └──────────────────────────┬────────────────────────────┘     │
        │                               │                                   │
        │         ┌────────────────────┼────────────────────┐              │
        │         │                    │                    │              │
        │         ▼                    ▼                    ▼              │
        │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
        │  │ contract-   │     │   event-    │     │  marketing- │  ...  │
        │  │ clearance   │     │   planner   │     │ communicatie│       │
        │  │   Agent     │     │   Agent     │     │    Agent    │       │
        │  └─────────────┘     └─────────────┘     └─────────────┘       │
        │         │                    │                    │              │
        └─────────┼────────────────────┼────────────────────┼──────────────┘
                  │                    │                    │
                  └────────────────────┴────────────────────┘
                                       │
                              ┌────────┴─────────┐
                              ▼                  ▼
                      ┌──────────────┐   ┌─────────────┐
                      │  DeepInfra   │   │ Context7 MCP│
                      │  (GLM-4.5)   │   │   Server    │
                      └──────────────┘   └─────────────┘
```

### Agent Specialization

Each agent has:
- **Unique System Prompt** - Defines personality and expertise
- **Custom Tools** - Specific MCP tools for its domain
- **Isolated Context** - Separate conversation history per tool

| Tool ID | Agent | Specialization |
|---------|-------|----------------|
| `contract-clearance` | ContractClearanceAgent | Legal contract review, compliance checks |
| `event-planner` | EventPlannerAgent | Event logistics, draaiboeken, planning |
| `event-contract-assistant` | EventContractAgent | Event-specific contract drafting |
| `marketing-communicatie` | MarketingAgent | Marketing copy, communications |

### Request Flow

1. **Frontend** → User selects tool → Sets `assistantType` parameter
2. **Proxy** → `/api/agent` receives request with `assistantType`
3. **Backend** → AgentRegistry routes to correct agent
4. **Agent** → Processes with specialized prompt and tools
5. **Response** → Streams back via SSE to frontend
6. **Database** → Saves to PocketBase with tool isolation

## Troubleshooting

**"ModuleNotFoundError: No module named 'pydantic_agents'"**
```bash
pip install -e ./pydantic-agents-core
```

**Next.js stuck on "Starting..."**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>
rm -rf .next
npm run dev
```

**Agent not responding**
- Verify DEEPINFRA_API_KEY is set
- Check agent server logs
- Test direct endpoint: `curl http://localhost:8000/`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test the integration
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check [TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md) for setup help
- Review [CLAUDE.md](./CLAUDE.md) for development guidelines
- Create an issue in the repository