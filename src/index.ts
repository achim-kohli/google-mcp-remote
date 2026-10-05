import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GoogleHandler } from "./auth-handler";
import type { Props } from "./utils/upstream-utils";
import { registerAllTools } from "./tools";

export class MyMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({
    name: "Google MCP Server - Remote",
    version: "1.0.0",
  });

  async init() {
    // Hello, world!
    this.server.tool(
      "greet",
      "Greet the use with a message",
      { name: z.string() },
      async ({ name }) => ({
        content: [{ type: "text", text: `Hello, ${name}!` }],
      })
    );
    // Tools capture this object once at registration time, but a Durable Object
    // waking from hibernation can run init() before props are rehydrated. Reading
    // through a proxy makes every tool call see the credentials that exist now.
    const liveProps = new Proxy({} as Props, { get: (_t, key) => key === "clientId" ? this.env.GOOGLE_OAUTH_CLIENT_ID : key === "clientSecret" ? this.env.GOOGLE_OAUTH_CLIENT_SECRET : (this.props as any)?.[key] });
    registerAllTools(this.server, liveProps);
  }
}

const mcpHandler = {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};

const provider = new OAuthProvider({
  apiRoute: ["/sse", "/mcp"],
  apiHandler: mcpHandler as any,
  defaultHandler: GoogleHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

// workers-oauth-provider 0.0.5 answers an expired or missing bearer token with
// a bare 401. MCP clients only start a fresh OAuth flow when that 401 carries a
// WWW-Authenticate challenge, so attach one pointing at the metadata document.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await provider.fetch(request, env, ctx);
    if (response.status !== 401 || response.headers.has("WWW-Authenticate")) return response;
    const origin = new URL(request.url).origin;
    const headers = new Headers(response.headers);
    headers.set("WWW-Authenticate", 'Bearer resource_metadata="' + origin + '/.well-known/oauth-protected-resource"');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
