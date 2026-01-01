# tiled-geojson

Tool for building tiled GeoJSON. Tiled GeoJSON allows for splitting up large geometry files into tiles with optional levels of detail for simplification at different zoom levels. Tiles are jagged so features are assigned unique IDs for deduplication purposes. Topology-preserving simplification is done using [mapshaper](https://github.com/mbloch/mapshaper).

Tiled GeoJSON consists of a directory containing a meta file (`tiledgeojson.json`) and a `tiles/` directory which contains the "tiles" under their hash.

```txt
tiled-geojson/
├─ tiledgeojson.json
├─ tiles/
│  ├─ <sha hash>.json
│  ├─ ...
```

This is useful for display on web maps, especially on static websites where you want to avoid hosting a tile server, or on dashboards where you only need to display a small section of the geometry. Avoids having to load large (100MB +) files before geometry is shown, and only loads what is shown, saving bandwidth and making for a better user experience.

## Leaflet plugin

See [leaflet-tiled-geojson](https://github.com/awhitesmith/leaflet-tiled-geojson) for a leaflet plugin to display tiled GeoJSON.

## Installation

Install globally using npm:
```bash
npm install -g tiled-geojson
```

You should now have access to the `tiled-geojson` command.

## Usage

Levels of detail are given by a comma separated list of the maximum zoom level at which they apply. The geometry is simplified with this zoom level in mind. If not specified, only one level of detail is created with no simplification. Optionally, tile sizes can be provided for each level of detail as a comma separated list.

```bash
tiled-geojson [options] <file> <dir>

Arguments:
  file                      geojson or shapefile to tile
  dir                       output directory

Options:
  -l, --lods <lods>         comma separated list of levels of details to include
  -s, --tile-sizes <sizes>  comma separated list of tile sizes for each lod
  -h, --help                display help for command
```

For example, the following command would take the shapefile `suburbs.shp` and create a tiled geojson folder at `suburbs-tiled/` with three levels of detail for zoom levels 6, 10 and 14 with tile sizes of 4, 2 and 1 degrees respectively.

```bash
tiled-geojson --lods 6,10,14 --tile-sizes 4,2,1 suburbs.shp suburbs-tiled/
```
