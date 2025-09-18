import { commentTagRegex, findHtmlFiles, generateCdnUrl } from "./utils.js";
import type { CDNPluginOptions, ModuleConfig } from "./types.js";
import { defineUtility } from "astro-integration-kit";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Creates a Vite plugin to transform specified module imports into CDN URLs.
 * @param options - The CDN plugin configuration.
 * @param cdnUrls - A Set to store the generated CDN URLs for later injection.
 * @returns A Vite plugin object.
 */
export function cdnVitePlugin(
	options: CDNPluginOptions,
	cdnUrls: Set<string>,
): Plugin {
	const { modules = [] } = options;

	// If no modules are configured, return a minimal plugin that does nothing.
	if (!modules.length) {
		return { name: "vite:cdn-loader-inactive" };
	}

	// Pre-compile regex patterns for all module configurations to improve performance.
	const modulePatterns = modules.map(createImportRegex);

	return {
		name: "vite:cdn-loader",
		enforce: "pre", // Run this plugin before others.
		apply: "build", // Only apply this plugin during production builds.

		/**
		 * Transforms the code of modules, removing specified imports and collecting
		 * their corresponding CDN URLs.
		 */
		transform(code, id) {
			// We only target specific file types that are likely to contain component logic.
			if (!/\.(astro|svelte|vue|jsx|tsx|mdx?)$/.test(id)) {
				return null;
			}

			let transformedCode = code;
			let hasTransformed = false;

			for (let i = 0; i < modulePatterns.length; i++) {
				const { regex } = modulePatterns[i];
				const moduleConfig = modules[i];

				// Reset regex state for global patterns.
				regex.lastIndex = 0;

				// Use a temporary variable to build the new code.
				let currentCode = "";
				let lastIndex = 0;
				let match;

				while ((match = regex.exec(transformedCode)) !== null) {
					// Append the part of the code before the match.
					currentCode += transformedCode.substring(lastIndex, match.index);

					// The import path captured from either of the regex groups.
					const importPath = match[1] || match[2];
					if (!importPath) continue;

					const cdnUrl = generateCdnUrl(importPath, options, moduleConfig);

					if (cdnUrl) {
						cdnUrls.add(cdnUrl);
						hasTransformed = true;
					} else {
						// If URL generation fails (e.g., version not found), keep the original import.
						currentCode += match[0];
					}
					// Update the last index to the end of the current match.
					lastIndex = match.index + match[0].length;
				}

				// Append the rest of the code after the last match.
				currentCode += transformedCode.substring(lastIndex);
				transformedCode = currentCode;
			}

			if (hasTransformed) {
				return {
					code: transformedCode,
					map: null, // Source maps are not generated for this transformation.
				};
			}

			return null;
		},
	};
}

/**
 * Creates a regular expression to find import statements for a given module configuration.
 * This handles various import syntaxes.
 * e.g., import 'module/path';
 * import defaultExport from 'module/path';
 * import { namedExport } from 'module/path';
 * @param config - The module configuration.
 * @returns An object containing the regex.
 */
function createImportRegex(config: ModuleConfig): { regex: RegExp } {
	// Converts wildcard '*' to a regex pattern that matches valid package name characters.
	const importPattern = config.name.replace(/\*/g, "[a-zA-Z0-9-@._~]+");

	// This regex captures two main forms of imports:
	// 1. `import ... from '...'` (with bindings)
	// 2. `import '...'` (for side effects, like CSS)
	const regex = new RegExp(
		// Catches `import { ... } from "..."` or `import ... from "..."`
		`import\\s+.*?\\s+from\\s*['"](${importPattern}(?:/[^'"]*)?)['"]|` +
			// Catches `import "..."`
			`import\\s*['"](${importPattern}(?:/[^'"]*)?)['"]`,
		"g",
	);

	return { regex };
}

export const InCommentsHtml = defineUtility("astro:build:done")(
	({ dir, logger }) => {
		const dist = dir.pathname;
		const htmlFiles = findHtmlFiles(dist);

		for (const filePath of htmlFiles) {
			const relativePath = path.relative(dist, filePath);
			try {
				let content = readFileSync(filePath, "utf-8");
				const headEndIndex = content.indexOf("</head>");
				const tags = new Set(
					[...content.matchAll(commentTagRegex)].map((m) => m[1]),
				);

				if (headEndIndex !== -1) {
					// Insert the link tags right before the closing </head> tag.
					content =
						content.slice(0, headEndIndex) +
						[...tags].join("") +
						content.slice(headEndIndex);

					// Write the modified content back to the file.
					writeFileSync(filePath, content, "utf-8");

					logger.info(`Injected ${tags.size} link(s) into ${relativePath}`);
				} else {
					logger.warn(
						`Could not find </head> tag in ${relativePath}. Skipping link injection.`,
					);
				}
			} catch (error) {
				logger.error(`Failed to process file ${relativePath}: ${error}`);
			}
		}
	},
);
