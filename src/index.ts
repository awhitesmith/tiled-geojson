import { Command } from 'commander';
import { simplifyGeometry } from './simplifier';
import { tmpdir } from 'os';
import { mkdirSync, mkdtemp, mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TiledGeoJSONMeta } from './types/tiledgeojson';
import { makeTiles } from './tiler';
import mapshaper from 'mapshaper';
import { getBbox } from './geojsonutils';
import crypto from 'crypto';
import fs from 'fs';

const program = new Command();

program.name("tiled-geojson")
    .argument('<file>', "geojson or shapefile to tile")
    .argument('<dir>', "output directory")
    .option('-l, --lods <lods>', "comma separated list of levels of details to include")
    .option('-s, --tile-sizes <sizes>', "comma separated list of tile sizes for each lod")
    .action(async (file, outputDir, opts) => {
        const tmpOutDir = mkdtempSync(join(tmpdir(), "tiledgeojson-"));
        const tmpOutFile = join(tmpOutDir, 'out.json');

        try {
            const lods: Array<number> = opts.lods ? opts.lods.split(",").map(Number) : [-1];
            const tileSizes: Array<number> = opts.tileSizes ? opts.tileSizes.split(",").map(Number) : lods.map(lod => 1);

            if (lods.length != tileSizes.length) {
                console.log("Number of tile sizes must match number of LODs.")
                return;
            }

            var result = await mapshaper.applyCommands(`
                ${file}
                -o format=geojson  
            `);

            const inputGeojson = JSON.parse(result[Object.keys(result).at(0)!].toString()) as GeoJSON.GeoJSON;

            const bbox = getBbox(inputGeojson);
            const xorigin = bbox?.[0]!;
            const yorigin = bbox?.[1]!;

            const meta: TiledGeoJSONMeta = {
                origin: {
                    x: xorigin,
                    y: yorigin
                },
                lods: []
            };

            const metaFile = join(outputDir, "tiledgeojson.json");

            for (var i = 0; i < lods.length; i++) {
                var maxZoom = lods[i]!;
                const tileSize = tileSizes[i]!;

                if (opts.simplify && maxZoom >= 0) {
                    await simplifyGeometry(file, tmpOutFile, maxZoom);
                } else {
                    fs.writeFileSync(tmpOutFile, JSON.stringify(inputGeojson));
                }

                const tiles = makeTiles(
                    JSON.parse(readFileSync(tmpOutFile).toString()),
                    tileSize,
                    xorigin,
                    yorigin
                );

                const tileHashes: any = {};

                // save tiles and record hashes
                for (const tile of tiles) {
                    const tileDataJson = JSON.stringify(tile.tileData);

                    const sha = crypto.createHash('sha1').update(tileDataJson).digest('hex');
                    tileHashes[`${tile.x},${tile.y}`] = sha;

                    mkdirSync(join(outputDir, "tiles"), { recursive: true });
                    writeFileSync(join(outputDir, "tiles", `${sha}.json`), tileDataJson);
                }

                meta.lods.push({
                    tileSize: tileSize,
                    maxZoom: maxZoom,
                    tiles: tileHashes
                })
            }

            mkdirSync(join(outputDir), { recursive: true });
            writeFileSync(join(outputDir, "tiledgeojson.json"), JSON.stringify(meta));

        } finally {
            rmSync(tmpOutFile, { force: true });
            rmdirSync(tmpOutDir);
        }
    }
);

export function runCommand(argv: string[]) {
    program.parse(argv);
}
