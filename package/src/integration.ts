import { z } from "astro/zod";
import { cdnVitePlugin } from "./vitePlugin.ts";
import { findHtmlFiles } from "./utils.js";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { defineIntegration } from "astro-integration-kit";

export const integration = defineIntegration({
	name: "astro-cdn-loader",
	optionsSchema: z.object({
		/**
		 * The URL template for the CDN. It should include placeholders for
		 * package name, version, and path.
		 * Placeholders: {pkg}, {ver}, {path}
		 * 
		 * @example "https://cdn.jsdelivr.net/npm/{pkg}@{ver}/{path}"
		 * @example "https://unpkg.com/{pkg}@{ver}/{path}"
		 */
		prodUrl: z.string(),

		/**
		 * If true, the package version is the one specified in the project's
		 * `package.json`. If false, the `@{ver}` or `{ver}` placeholder will
		 * be removed to fetch the latest version.
		 * 
		 * @default true
		 */
		lockVersion: z.boolean().default(true),

		/**
		 * An array of module configurations to apply the CDN transformation to.
		 */
		modules: z.array(
			z.object({
				/**
				 * The name of the module to target. Can include a single wildcard '*'
				 * to match dynamic package names (e.g., '@fontsource/*').
				 */
				name: z.string(),

				/**
				 * An optional path transformation rule. Use "{}" as a placeholder for the
				 * original subpath extracted from the import.
				 * Example: "dist/{}" -> "dist/util.css" if the original import was "pkg/util.css".
				 * 
				 * @default ""
				 */
				path: z.string().default(""),
			}),
		),
	}),
	setup({ options }) {
		const cdnUrls = new Set<string>();

		return {
			hooks: {
				"astro:config:setup": ({ updateConfig }) => {
					updateConfig({
						vite: {
							plugins: [cdnVitePlugin(options, cdnUrls)],
						},
					});
				},

				/**
				 * After the build is complete, this hook injects the collected CDN links
				 * into the final HTML files.
				 */
				"astro:build:done": async ,
			},
		};
	},
});
