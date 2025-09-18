# `astro-cdn-loader`

An [Astro](https://astro.build/) integration to load packages from a CDN like [jsDelivr](https://www.jsdelivr.com/) or [unpkg](https://unpkg.com/).

## Usage

### Prerequisites

- [Astro](https://astro.build/) >= 5.0.0

### Installation

Install the integration **automatically** using the Astro CLI:

```bash
pnpm astro add astro-cdn-loader
```

```bash
npx astro add astro-cdn-loader
```

```bash
yarn astro add astro-cdn-loader
```

Or install it **manually**:

1. Install the required dependencies

    ```bash
    pnpm add astro-cdn-loader
    ```

    ```bash
    npm install astro-cdn-loader
    ```

    ```bash
    yarn add astro-cdn-loader
    ```

2. Add the integration to your astro config

    ```diff
    +import CdnLoader from "astro-cdn-loader";

     export default defineConfig({
         integrations: [
    +        CdnLoader(),
         ],
     });
    ```

### Configuration

TODO:configuration

## Contributing

This package is structured as a monorepo:

- `playground` contains code for testing the package
- `package` contains the actual package

Install dependencies using pnpm:

```bash
pnpm i --frozen-lockfile
```

Start the playground and package watcher:

```bash
pnpm dev
```

You can now edit files in `package`. Please note that making changes to those files may require restarting the playground dev server.

## Licensing

[MIT Licensed](https://github.com/anmoti/astro-cdn-loader/blob/main/LICENSE). Made with ❤️ by [anmoti](https://github.com/anmoti).

## Acknowledgements

- Created using [astro-integration-template](https://github.com/florian-lefebvre/astro-integration-template).
- Inspired by [vite-plugin-cdn-import](https://github.com/MMF-FE/vite-plugin-cdn-import).
