import mapshaper from 'mapshaper';
import fs from 'fs';
import os from 'os';

// Simplify a geometry for the given zoom level
export async function simplifyGeometry(inputFile: string, outputFile: string, zoomLevel: number) {
    const resolution = zoomToResolution(zoomLevel);

    // simplify
    var result = await mapshaper.applyCommands(`
        "${inputFile}"
        -simplify
        interval=${resolution}
        -o format=geojson
    `);

    // round / snap to grid
    var geojson = JSON.parse(result[Object.keys(result).at(0)!].toString()) as GeoJSON.GeoJSON;
    geojson = roundGeojson(geojson, zoomLevel);

    fs.writeFileSync(outputFile, JSON.stringify(geojson));

    // filter empty geometries
    result = await mapshaper.applyCommands(`
        "${outputFile}"
        -filter
        expression='this.area != 0'
        -o format=geojson
    `);
    fs.writeFileSync(outputFile, result[Object.keys(result).at(0)!]);
    
    // combine overlapping
    result = await mapshaper.applyCommands(`
        "${outputFile}"
        -merge-layers
        flatten
        -o format=geojson
    `);
    fs.writeFileSync(outputFile, result[Object.keys(result).at(0)!]);
}

// Rounds coordinates in a geojson object for the given zoom level
function roundGeojson<T extends GeoJSON.GeoJSON>(geojson: T, zoomLevel: number): T {
    const resolutionMeters = zoomToResolution(zoomLevel);

    if (geojson.type == 'FeatureCollection') {
        geojson.features = geojson.features.map(feature => roundGeojson(feature, zoomLevel));
    } else if (geojson.type == 'GeometryCollection') {
        geojson.geometries = geojson.geometries.map(geometry => roundGeojson(geometry, zoomLevel));
    } else if (geojson.type == 'Feature') {
        if (geojson.geometry != null) {
            geojson.geometry = roundGeojson(geojson.geometry, zoomLevel);
        }
    } else if (geojson.type == 'Point') {
        geojson.coordinates = geojson.coordinates.map(coord => roundCoord(coord, resolutionMeters));
    } else if (geojson.type == 'LineString' || geojson.type == 'MultiPoint') {
        geojson.coordinates = geojson.coordinates.map(position => position.map(coord => roundCoord(coord, resolutionMeters)));
    } else if (geojson.type == 'Polygon' || geojson.type == 'MultiLineString') {
        geojson.coordinates = geojson.coordinates.map(positions => positions.map(position => {
            return position.map(coord => roundCoord(coord, resolutionMeters));
        }));
    } else if (geojson.type == 'MultiPolygon') {
        geojson.coordinates = geojson.coordinates.map(polygons => polygons.map(positions => positions.map(position => {
            return position.map(coord => roundCoord(coord, resolutionMeters));
        })));
    }

    return geojson;
}

// Round a coordinate to the given resolution
function roundCoord(number: number, resolutionMeters: number) {
    return Math.round(number * 1e5 / resolutionMeters) * resolutionMeters / 1e5;
}

// Convert a zoom level to a resolution in meters
// Represents the rough "pixel width" of the zoom level
function zoomToResolution(zoomLevel: number) {
    // approx 150 meters per pixel at zoom level 10
    return 150 * Math.pow(2, 10 - zoomLevel);
}
