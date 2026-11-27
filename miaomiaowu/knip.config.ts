import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: ['src/components/ui/**', 'src/routeTree.gen.ts', 'src/lib/template-v3-proxy-collections.test.ts'],
  ignoreDependencies: ["tailwindcss", "tw-animate-css"]
};

export default config;