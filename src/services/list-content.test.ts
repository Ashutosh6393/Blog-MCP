import { describe, expect, test } from "bun:test";
import type { Site } from "../lib/site";
import { listContent } from "./list-content";

// T-11, T-12, T-13, T-14 — see specs/001-server-skeleton/design.md → Test cases,
// and → Approach → Errors: "Tool failures are returned as tool results, never
// thrown." That rule applies at this layer too — listContent never throws and
// never returns a rejected promise for a site failure or a bad shape.
//
// Result shape — source of truth for Task 7 (src/tools/list-content.ts):
//
//   { ok: true; items: Writing[] } | { ok: true; items: Project[] }
//   | { ok: false; error: string }
//
// `items` carries the parsed, typed array straight from `writingListSchema` /
// `projectListSchema` (src/lib/site.ts) — no re-shaping. `error` is a sentence
// naming the site and, on a bad shape, the parse failure — never the literal
// string "undefined".
//
// The seam is `deps.site`: every fake below is a plain object literal
// satisfying `Site` from lib/site.ts. No mocking framework, no `as any`.

describe("listContent", () => {
	test("T-11: lists writings with slugs and titles present", async () => {
		const writings = [
			{
				slug: "hello-world",
				title: "Hello World",
				date: "2026-01-01",
				readingTime: "3 min",
				summary: "A first post.",
			},
			{
				slug: "second-post",
				title: "Second Post",
				date: "2026-02-01",
				readingTime: "5 min",
				summary: "Another post.",
			},
		];
		// Test revision, 2026-08-03 — see Test revisions table in
		// specs/005-publish/implementation.md. Task 4 widens `Site` with
		// `fetchSchema`, so every fake must carry it to typecheck. listContent
		// only reads, so this throws rather than return a plausible value: an
		// accidental call fails loudly instead of passing silently.
		// Test revision, 2026-08-03 (second) — see Test revisions table in
		// specs/005-publish/implementation.md. Task 6 widens `Site` with
		// `fetchDocument`, so every fake below carries it too; same reasoning.
		const site: Site = {
			async fetchContent() {
				return writings;
			},
			async fetchSchema(): Promise<never> {
				throw new Error("fetchSchema is not part of this test");
			},
			async fetchDocument(): Promise<never> {
				throw new Error("fetchDocument is not part of this test");
			},
		};

		const result = await listContent({ site }, { kind: "writing" });

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok result");
		expect(result.items).toHaveLength(2);
		expect(result.items.map((item) => item.slug)).toEqual([
			"hello-world",
			"second-post",
		]);
		expect(result.items.map((item) => item.title)).toEqual([
			"Hello World",
			"Second Post",
		]);
	});

	test("T-12: lists projects with stack and status carried through", async () => {
		const projects = [
			{
				slug: "blog-mcp",
				title: "Blog MCP",
				summary: "An MCP server for the site.",
				stack: ["TypeScript", "Bun"],
				status: "live",
				repo: "ashutosh625/blog-mcp",
			},
			{
				slug: "another-project",
				title: "Another Project",
				summary: "Also a project.",
				stack: ["Rust"],
				status: "archived",
				repo: "ashutosh625/another-project",
			},
		];
		const site: Site = {
			async fetchContent() {
				return projects;
			},
			async fetchSchema(): Promise<never> {
				throw new Error("fetchSchema is not part of this test");
			},
			async fetchDocument(): Promise<never> {
				throw new Error("fetchDocument is not part of this test");
			},
		};

		const result = await listContent({ site }, { kind: "project" });

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok result");
		expect(result.items).toHaveLength(2);
		expect(result.items.map((item) => item.slug)).toEqual([
			"blog-mcp",
			"another-project",
		]);
		expect(result.items.map((item) => item.stack)).toEqual([
			["TypeScript", "Bun"],
			["Rust"],
		]);
		expect(result.items.map((item) => item.status)).toEqual([
			"live",
			"archived",
		]);
	});

	test("T-13: reports a site failure as an error result, never throws", async () => {
		const failingSite: Site = {
			async fetchContent() {
				// The real site.ts throws on a non-200 response, so a throwing fake
				// covers both "site is down" paths per the same mechanism.
				throw new Error(
					"Failed to fetch writing content from ashutoshverma.dev",
				);
			},
			async fetchSchema(): Promise<never> {
				throw new Error("fetchSchema is not part of this test");
			},
			async fetchDocument(): Promise<never> {
				throw new Error("fetchDocument is not part of this test");
			},
		};

		let thrown: unknown;
		let result: Awaited<ReturnType<typeof listContent>> | undefined;
		try {
			result = await listContent({ site: failingSite }, { kind: "writing" });
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeUndefined();
		expect(result).toBeDefined();
		if (!result || result.ok) throw new Error("expected an error result");
		expect(result.error).toContain("ashutoshverma.dev");
	});

	test("T-14: reports an unexpected shape as an error result, no undefined leaking in", async () => {
		const site: Site = {
			async fetchContent() {
				return [{ nope: 1 }];
			},
			async fetchSchema(): Promise<never> {
				throw new Error("fetchSchema is not part of this test");
			},
			async fetchDocument(): Promise<never> {
				throw new Error("fetchDocument is not part of this test");
			},
		};

		let thrown: unknown;
		let result: Awaited<ReturnType<typeof listContent>> | undefined;
		try {
			result = await listContent({ site }, { kind: "writing" });
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeUndefined();
		expect(result).toBeDefined();
		if (!result || result.ok) throw new Error("expected an error result");
		expect(result.error).not.toContain("undefined");
		expect(result.error.length).toBeGreaterThan(0);
	});

	// Edge case — design.md → Edge cases: "Empty content list. The site returns
	// [] — a valid answer, not an error."
	test("an empty content list is a valid result, not an error", async () => {
		const site: Site = {
			async fetchContent() {
				return [];
			},
			async fetchSchema(): Promise<never> {
				throw new Error("fetchSchema is not part of this test");
			},
			async fetchDocument(): Promise<never> {
				throw new Error("fetchDocument is not part of this test");
			},
		};

		const result = await listContent({ site }, { kind: "writing" });

		expect(result.ok).toBe(true);
		if (!result.ok) throw new Error("expected ok result");
		expect(result.items).toEqual([]);
	});
});
