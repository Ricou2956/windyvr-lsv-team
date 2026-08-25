import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import rollupSvelte from 'rollup-plugin-svelte';
import rollupCleanup from 'rollup-plugin-cleanup';
import { transformCodeToESMPlugin, keyPEM, certificatePEM } from '@windycom/plugin-devtools';

export default {
  input: 'src/plugin.svelte',
  output: [
    { file: 'dist/plugin.js', format: 'module', sourcemap: true },
    {
      file: 'dist/plugin.min.js',
      format: 'module',
      plugins: [rollupCleanup({ comments: 'none' }), terser()],
    },
  ],
  onwarn: () => {},
  external: id => id.startsWith('@windy/'),
  watch: { include: ['src/**'], exclude: 'node_modules/**', clearScreen: false },
  plugins: [
    rollupSvelte({ emitCss: false }),
    resolve({ browser: true, extensions: ['.mjs', '.js', '.json', '.node', '.ts'], mainFields: ['module', 'jsnext:main', 'main'], preferBuiltins: false, dedupe: ['svelte'] }),
    commonjs(),
    transformCodeToESMPlugin(),
    process.env.SERVE !== 'false' && serve({
      contentBase: 'dist', host: '0.0.0.0', port: 9999,
      headers: { 'Access-Control-Allow-Origin': '*' },
      https: { key: keyPEM, cert: certificatePEM },
    }),
  ],
};
