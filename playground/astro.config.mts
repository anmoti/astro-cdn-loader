import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { createResolver } from "astro-integration-kit";
import { hmrIntegration } from "astro-integration-kit/dev";

const { default: CdnLoader } = await import("astro-cdn-loader");

// https://astro.build/config
export default defineConfig({
	integrations: [
		CdnLoader(),
		hmrIntegration({
			directory: createResolver(import.meta.url).resolve("../package/dist"),
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
