import type { McpHttpHandler } from "@modelcontextprotocol/server";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import type { Github } from "../lib/github";
import type { Site } from "../lib/site";
import { registerDiscardDraft } from "./discard-draft";
import { registerGetContent } from "./get-content";
import { registerGetSkill } from "./get-skill";
import { registerListContent } from "./list-content";
import { registerPublish } from "./publish";
import { registerSaveDraft } from "./save-draft";

// The factory runs once per HTTP request (see task brief's SDK facts), so the
// server — and every tool on it — is built fresh inside it.
export function createHandler(deps: {
	site: Site;
	github: Github;
}): McpHttpHandler {
	return createMcpHandler(() => {
		const server = new McpServer({ name: "blog-mcp", version: "0.1.0" });
		registerListContent(server, deps);
		registerGetSkill(server, deps);
		registerSaveDraft(server, deps);
		registerGetContent(server, deps);
		registerDiscardDraft(server, deps);
		registerPublish(server, deps);
		return server;
	});
}
