import { defineIntegration } from "astro-integration-kit";

export const integration = defineIntegration({
	name: "astro-cdn-loader",
	setup() {
		return {
			hooks: {},
		};
	},
});
