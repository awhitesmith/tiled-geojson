import { BBox, Feature, FeatureCollection, GeoJSON, Geometry, GeometryCollection, Point, Position } from 'geojson'
import { features } from 'process';
import crypto from 'crypto';
import fs from 'fs';
import { TiledGeoJSONTileData } from './types/tiledgeojson';
import { bbIntersects, getBbox } from './geojsonutils';


// Split the provided geojson object into a collection of tiles
export function makeTiles(
    geojson: FeatureCollection,
    tileSize: number,
    xorigin: number,
    yorigin: number
): Array<{
    x: number,
    y: number,
    tileData: TiledGeoJSONTileData
}> {
    var idCounter = 0;

    const totalBbox = getBbox(geojson);
    
    if (!totalBbox) {
        return [];
    }

    // add feature IDs
    for (const feature of geojson.features) {
        if (!feature.properties) {
            feature.properties = {};
        }
        (feature as any).__fid = idCounter;
        idCounter++;
    }

    const xmin = totalBbox[0];
    const ymin = totalBbox[1];
    const xmax = totalBbox[2];
    const ymax = totalBbox[3];

    const tiles = [];

    const xstart = Math.floor((xmin - xorigin) / tileSize);
    const ystart = Math.floor((ymin - yorigin) / tileSize);

    for (var x = xstart; xorigin + x * tileSize < xmax; x++) {
        for (var y = ystart; yorigin + y * tileSize < ymax; y++) {
            const tileBbox: BBox = [
                xorigin + x * tileSize, yorigin + y * tileSize,
                xorigin + (x + 1) * tileSize, yorigin + (y + 1) * tileSize
            ];

            const tile: TiledGeoJSONTileData = {
                features: geojson.features.filter(feature => bbIntersects(tileBbox, getBbox(feature)))
            };

            if (tile.features.length == 0) {
                continue;
            }

            tiles.push({
                x: x,
                y: y,
                tileData: tile
            });
        }
    }

    return tiles as any;
}
