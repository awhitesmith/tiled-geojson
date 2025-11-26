import { BBox, Position } from 'geojson';

export function bbIntersects(bbox1?: BBox, bbox2?: BBox) {
    if (!bbox1 || !bbox2) {
        return false;
    }

    if (bbox1[2] < bbox2[0] ||
        bbox1[0] > bbox2[2] ||
        bbox1[3] < bbox2[1] ||
        bbox1[1] > bbox2[3]
    ) {
        return false;
    }

    return true
}

export function getBbox(geojson: GeoJSON.GeoJSON): BBox | undefined {
    if (geojson.type == 'FeatureCollection') {
        var bbox: BBox | undefined = undefined;
        for (const feature of geojson.features) {
            bbox = combineBbox(bbox, getBbox(feature));
        }
        return bbox;
    } else if (geojson.type == 'GeometryCollection') {
        var bbox: BBox | undefined = undefined;
        for (const geometry of geojson.geometries) {
            bbox = combineBbox(bbox, getBbox(geometry));
        }
        return bbox;
    } else if (geojson.type == 'Feature') {
        if (geojson.geometry == null) {
            return undefined;
        }
        return getBbox(geojson.geometry);
    } else if (geojson.type == 'Point') {
        return getBbox_pos(geojson.coordinates);
    } else if (geojson.type == 'LineString' || geojson.type == 'MultiPoint') {
        var bbox: BBox | undefined = undefined;
        for (const pos of geojson.coordinates) {
            bbox = combineBbox(bbox, getBbox_pos(pos));
        }
        return bbox;
    } else if (geojson.type == 'MultiLineString' || geojson.type == 'Polygon') {
        var bbox: BBox | undefined = undefined;
        for (const positions of geojson.coordinates) {
            for (const pos of positions) {
                bbox = combineBbox(bbox, getBbox_pos(pos));
            }
        }
        return bbox;
    } else if (geojson.type == 'MultiPolygon') {
        var bbox: BBox | undefined = undefined;
        for (const polygon of geojson.coordinates) {
            for (const positions of polygon) {
                for (const pos of positions) {
                    bbox = combineBbox(bbox, getBbox_pos(pos));
                }
            }
        }
        return bbox;
    }

    return undefined;
}

export function getBbox_pos(coord: Position): BBox {
    return [
        coord[0]!, coord[1]!,
        coord[0]!, coord[1]!
    ];
}

export function combineBbox(bbox1?: BBox, bbox2?: BBox): BBox | undefined {
    if (bbox1 == undefined) {
        return bbox2;
    }
    if (bbox2 == undefined) {
        return bbox1;
    }
    return [
        Math.min(bbox1[0], bbox2[0]),
        Math.min(bbox1[1], bbox2[1]),
        Math.max(bbox1[2], bbox2[2]),
        Math.max(bbox1[3], bbox2[3])
    ];
}