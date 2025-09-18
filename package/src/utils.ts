import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { CDNPluginOptions, ModuleConfig } from "./types.js";

const require = createRequire(import.meta.url);

export const commentTagRegex = /\s*\/\*\s*(<[^*]+>)\s*\*\/\s*/g;

/**
 * A cache to store resolved package versions to avoid redundant file system lookups.
 */
const versionCache = new Map<string, string>();

/**
 * Resolves the version of a given package from its package.json file.
 * @param pkgName - The name of the package.
 * @returns The version string, or null if not found.
 */
export function resolvePkgVersion(pkgName: string): string | null {
	if (versionCache.has(pkgName)) {
		return versionCache.get(pkgName) ?? null;
	}

	try {
		const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
		const json = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
		const version = json.version || null;
		if (version) {
			versionCache.set(pkgName, version);
		}
		return version;
	} catch (error) {
		console.warn(
			`[cdn-loader] Failed to resolve version for package: ${pkgName}`,
		);
		return null;
	}
}

/**
 * Generates a CDN URL based on an import path and the plugin configuration.
 * @param importPath - The path from the import statement (e.g., 'prefers-color-scheme/css').
 * @param options - The main plugin options.
 * @param moduleConfig - The specific module configuration that matched the import.
 * @returns The full CDN URL string, or null if resolution fails.
 */
export function generateCdnUrl(
	importPath: string,
	options: CDNPluginOptions,
	moduleConfig: ModuleConfig,
): string | null {
	const { prodURL, lockVersion = true } = options;

	// Convert wildcard pattern in module name to a regex to extract package name and subpath.
	const namePattern = moduleConfig.name
		.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, "([^/]+)");
	const regex = new RegExp(`^${namePattern}(?:/(.*))?$`);
	const match = importPath.match(regex);

	if (!match) return null;

	// Reconstruct the package name using the matched wildcard part.
	const pkg = match[1]
		? moduleConfig.name.replace("*", match[1])
		: moduleConfig.name;
	const subpath = match[2] || "";

	// Determine the final path for the URL.
	let finalPath = subpath || "index.css";
	// Apply path template if provided.
	if (moduleConfig.path && moduleConfig.path !== "{}") {
		finalPath = moduleConfig.path.replace("{}", finalPath);
	}

	const version = lockVersion ? resolvePkgVersion(pkg) : null;
	if (lockVersion && !version) {
		// If version locking is enabled but the version can't be resolved, fail gracefully.
		return null;
	}

	// Build the final URL by replacing placeholders.
	let url = prodURL.replace("{pkg}", pkg).replace("{path}", finalPath);
	if (lockVersion && version) {
		url = url.replace("{ver}", version);
	} else {
		// If not locking version, remove the @{ver} part to use the latest version.
		url = url.replace(/@?\{ver\}/, "");
	}

	return url;
}

/**
 * Recursively finds all HTML files in a given directory.
 * @param dirPath - The absolute path to the directory to start searching from.
 * @returns An array of absolute paths to the found HTML files.
 */
export function findHtmlFiles(dirPath: string): string[] {
	const files: string[] = [];

	function walk(currentDir: string) {
		const entries = readdirSync(currentDir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.isFile() && entry.name.endsWith(".html")) {
				files.push(fullPath);
			}
		}
	}

	walk(dirPath);
	return files;
}
