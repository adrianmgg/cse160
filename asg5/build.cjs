const esbuild = require('esbuild');
const yargs = require('yargs');

const args = yargs
    .option('watch', {type: 'boolean', default: false})
    .help()
    .argv;

esbuild.build({
    entryPoints: ['src/ts/main.ts'],
    bundle: true,
    minify: false,
    sourcemap: true,
    outfile: 'src/build/main.js',
    watch: args.watch ? {
        onRebuild(error, result) {
            if(error) console.error('watch build fail: ', result);
            else      console.log('watch build success: ', result);
        }
    } : undefined,
});
