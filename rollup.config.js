import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const FILENAME = 'lightweight-charts-line-tools-volume-profile';
const GLOBAL_VAR_NAME = 'LightweightChartsLineToolsVolumeProfile';

const GLOBALS = {
  'lightweight-charts': 'LightweightCharts',
  'lightweight-charts-line-tools-core': 'LightweightChartsLineToolsCore',
};

const EXTERNAL = ['lightweight-charts', 'lightweight-charts-line-tools-core'];

export default {
  input: 'src/index.ts',
  output: [
    {
      file: `dist/${FILENAME}.js`,
      format: 'es',
      sourcemap: true,
    },
    {
      file: `dist/${FILENAME}.umd.js`,
      format: 'umd',
      name: GLOBAL_VAR_NAME,
      globals: GLOBALS,
      sourcemap: true,
    },
    {
      file: `dist/${FILENAME}.min.js`,
      format: 'umd',
      name: GLOBAL_VAR_NAME,
      globals: GLOBALS,
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/types',
      rootDir: 'src',
    }),
  ],
  external: EXTERNAL,
};
