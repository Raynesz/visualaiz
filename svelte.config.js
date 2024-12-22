import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter({
      // Options for static adapter
      pages: "build", // Directory for built files
      assets: "build", // Directory for assets
      fallback: "index.html", // Set to 'index.html' for SPA fallback
      precompress: false, // Enable gzip/brotli compression if needed
    }),
    paths: {
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		}
  },
};

export default config;
