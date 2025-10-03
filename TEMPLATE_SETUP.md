# Template Setup and Customization Guide

This guide explains how to customize this AI Assistant Template for your specific project.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Branding Customization](#branding-customization)
- [PocketBase Setup](#pocketbase-setup)
- [Agent Configuration](#agent-configuration)
- [Development Workflow](#development-workflow)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.12+
- PocketBase instance (local or remote)

### Installation

1. **Install Next.js dependencies:**
   ```bash
   npm install
   ```

2. **Install Python agent dependencies:**
   ```bash
   cd ..
   pip install -r requirements.txt
   pip install -e ./pydantic-agents-core
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and URLs
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1: Start agent backend
   cd ..
   python -m pydantic_agents.server

   # Terminal 2: Start Next.js frontend
   cd nextjs-frontend-template
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Agent API: http://localhost:8000
   - PocketBase Admin: YOUR_POCKETBASE_URL/_/

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the `nextjs-frontend-template` directory:

```bash
# PocketBase Configuration
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-instance.com
POCKETBASE_ADMIN_EMAIL=admin@yourcompany.com
POCKETBASE_ADMIN_PASSWORD=your_secure_password

# Agent Backend
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_AGENT_BACKEND=true

# AI Configuration (for direct Mistral usage, optional)
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_API_URL=https://api.mistral.ai/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=Your App Name
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_FUNCTION_VISUALIZATION=true
```

### Agent Backend Configuration

Create a `.env` file in the project root (parent directory):

```bash
# LLM Provider
DEEPINFRA_API_KEY=your_deepinfra_api_key

# MCP Server (for agent tools)
MY_AGENT_MCP_URL=https://mcp.context7.com/mcp

# Server Configuration
PORT=8000
HOST=0.0.0.0
```

## Branding Customization

### 1. Update Application Name

**File: `nextjs-frontend-template/src/app/layout.tsx`**

```typescript
export const metadata: Metadata = {
  title: "Your App Name",
  description: "Your app description",
}
```

**File: `nextjs-frontend-template/package.json`**

```json
{
  "name": "your-app-name",
  "version": "0.1.0"
}
```

### 2. Customize Logo

**File: `nextjs-frontend-template/src/components/branding/brand-logo.tsx`**

Replace the placeholder with your actual logo:

```typescript
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/your-logo.svg"
        alt="Your Company"
        width={32}
        height={32}
      />
      <span className="font-semibold text-lg">Your App Name</span>
    </div>
  )
}
```

### 3. Update Prompts

Replace generic placeholders in `nextjs-frontend-template/src/prompts/*.md`:

```bash
# Find and replace across all prompt files
[COMPANY_NAME] → Your Company Name
[COMPANY_DESCRIPTION] → Your company description
[INDUSTRY] → Your industry
```

### 4. Update Agent System Prompt

**File: `pydantic_agents/clients/default/agents/my_agent/system_prompt.md`**

Customize the agent's personality and capabilities:

```markdown
You are an AI assistant for [Your Company Name].

Your role is to help users with:
- [Primary task 1]
- [Primary task 2]
- [Primary task 3]

Guidelines:
- [Guideline 1]
- [Guideline 2]
```

## PocketBase Setup

### Option 1: Using Remote PocketBase (Recommended for Production)

1. Create a PocketBase instance on [Railway](https://railway.app/) or [Fly.io](https://fly.io/)
2. Update `.env.local` with your PocketBase URL
3. Create the required collections (see below)

### Option 2: Local PocketBase (Development)

1. Download PocketBase from https://pocketbase.io/docs/
2. Start PocketBase:
   ```bash
   ./pocketbase serve
   ```
3. Access admin UI at http://127.0.0.1:8090/_/

### Creating Required Collections

The template requires two collections: `conversations` and `messages`.

**Method 1: Using the Python script (Automated)**

```bash
# Update the script with your PocketBase URL and credentials
python create_collections.py
```

**Method 2: Manual creation via PocketBase Admin UI**

1. **Create `conversations` collection:**
   - Type: Base
   - Fields:
     - `title` (text, optional)
     - `userId` (relation to users, required)
     - `assistantType` (text, optional)
     - `lastMessage` (text, optional)
     - `isActive` (bool, optional)
   - Access rules:
     - List: `@request.auth.id != "" && userId = @request.auth.id`
     - View: `@request.auth.id != "" && userId = @request.auth.id`
     - Create: `@request.auth.id != "" && userId = @request.auth.id`
     - Update: `@request.auth.id != "" && userId = @request.auth.id`
     - Delete: `@request.auth.id != "" && userId = @request.auth.id`

2. **Create `messages` collection:**
   - Type: Base
   - Fields:
     - `conversationId` (relation to conversations, required)
     - `role` (text, required)
     - `content` (editor, required)
     - `userId` (relation to users, required)
   - Access rules:
     - All operations: `@request.auth.id != ""`

### Creating a Test User

```bash
# Via PocketBase Admin UI
1. Go to Collections → users
2. Click "New record"
3. Fill in: email, password, name
4. Save
```

## Agent Configuration

### Adding Custom Tools

Agents can use MCP (Model Context Protocol) tools. The template is pre-configured with Context7 for documentation lookup.

**File: `pydantic_agents/clients/default/agents/my_agent/agent.py`**

```python
# Add additional MCP servers
from pydantic_ai.mcp import MCPServerStreamableHTTP

custom_mcp = MCPServerStreamableHTTP("https://your-mcp-server.com/mcp")

return Agent(
    model=MODEL_NAME,
    toolsets=[mcp_server, custom_mcp],  # Add your custom tools
    system_prompt=system_prompt,
    retries=20
)
```

### Changing the AI Model

**File: `pydantic_agents/clients/default/agents/my_agent/agent.py`**

```python
# Change from DeepInfra GLM-4.5 to another model
MODEL_NAME = "openai:gpt-4o"  # or "anthropic:claude-3-5-sonnet-20241022"

# Update environment variables accordingly
# For OpenAI: OPENAI_API_KEY
# For Anthropic: ANTHROPIC_API_KEY
```

## Development Workflow

### Running in Development Mode

```bash
# Start both servers in parallel (separate terminals)
python -m pydantic_agents.server  # Backend on :8000
npm run dev                        # Frontend on :3000
```

### Testing the Integration

```bash
# Run integration tests
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
# Build Next.js frontend
npm run build

# Run production build
npm start
```

### Common Issues

**Issue: "ModuleNotFoundError: No module named 'pydantic_agents'"**

Solution:
```bash
pip install -e ./pydantic-agents-core
pip install -r requirements.txt
```

**Issue: Next.js gets stuck on "Starting..."**

Solution:
```bash
# On Windows, kill the process and clear cache
netstat -ano | findstr :3000
taskkill /F /PID <PID>
rm -rf .next
npm run dev
```

**Issue: Agent not responding**

Solution:
```bash
# Check environment variables are set
# Verify DEEPINFRA_API_KEY is valid
# Check agent backend logs for errors
```

## Next Steps

1. **Customize the UI** - Modify components in `src/components/`
2. **Add new agent capabilities** - Edit system prompt and add tools
3. **Configure authentication** - Set up OAuth providers in PocketBase
4. **Deploy** - See deployment guide for production setup

## Support

For issues and questions:
- Check the main [README.md](../README.md)
- Review [CLAUDE.md](./CLAUDE.md) for development guidelines
- Create an issue in your project repository
