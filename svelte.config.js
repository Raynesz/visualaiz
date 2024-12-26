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
      fallback: "404.html", // GitHub Pages requires 404.html as the fallback
      precompress: false, // Enable gzip/brotli compression if needed
      prerender: true, // Enable static generation
      ssr: false, // Disable server-side rendering
      csr: true, // Enable client-side rendering
      trailingSlash: "ignore",
    }),
    paths: {
      base: process.env.BASE_PATH || "",
    },
  },
};

export default config;
