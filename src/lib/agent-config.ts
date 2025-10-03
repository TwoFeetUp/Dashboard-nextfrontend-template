/**
 * Agent Configuration Utility
 *
 * Determines which chat backend to use based on environment variables.
 */

export const agentConfig = {
  /**
   * Returns true if the app should use the agent backend instead of direct Mistral
   */
  useAgentBackend: () => {
    return process.env.NEXT_PUBLIC_USE_AGENT_BACKEND === 'true'
  },

  /**
   * Returns the appropriate API endpoint based on configuration
   */
  getChatEndpoint: () => {
    return agentConfig.useAgentBackend() ? '/api/agent' : '/api/chat'
  },

  /**
   * Returns the agent backend URL (for debugging/display purposes)
   */
  getAgentBackendUrl: () => {
    return process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'
  },

  /**
   * Returns whether function visualization is enabled
   */
  isFunctionVisualizationEnabled: () => {
    return process.env.NEXT_PUBLIC_ENABLE_FUNCTION_VISUALIZATION !== 'false'
  }
}
