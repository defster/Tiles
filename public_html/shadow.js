/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
function getEdges(map, n, relX, relY, tilesize)
{
        // Next, get a list of all the edges in 'n'
        // Store only the four corners we find in each iteration.
        var corners = [], edges = [], cx, cy, x, y, c = 0;
        var ul, ur, ll, lr;
        for (var i = 0; i < n.length; i++)
        {
            for (var t = 0; t < 4; t++)
                corners[t] = [-1, -1, -1];

            x = n[i][1];
            y = n[i][0];
            //cy = ((y * tilesize) + midy - posy);
            //cx = ((x * tilesize) + midx - posx);
            cy = ((y * tilesize) + relY);
            cx = ((x * tilesize) + relX);

            // vars for corners, upper left etc.
            ul = false, ur = false, ll = false, lr = false;
            
            // Only create endpoints if surrounding blocks are non-walls
            if (y > 0 && map[y - 1][x] === 0) { ul = true; ur = true; }
            if (y < map.length - 1 && map[y + 1][x] === 0) { ll = true; lr = true; }
            if (x < map[0].length - 1 && map[y][x + 1] === 0) { ur = true; lr = true; }
            if (x > 0 && map[y][x - 1] === 0) { ul = true; ll = true; }

            // Found all valid corners, now see which ones connect to form a line.
            if (ul)
            {
                corners[0] = [cy, cx, -1];
                if (y > 0 && ur)
                    if (map[y - 1][x] === 0)
                        corners[0][2] = 1; // Connection allowed.
            }
            
            if (ur)
            {
                corners[1] = [cy, cx + tilesize, -1];
                if (x < map[0].length - 1)
                    if (map[y][x + 1] === 0)
                        corners[1][2] = 1;
            }
            
            if (lr)
            {
                corners[2] = [cy + tilesize, cx + tilesize, -1];
                if (y < map.length - 1)
                    if (map[y + 1][x] === 0)
                        corners[2][2] = 1;
            }
            
            if (ll)
            {
                corners[3] = [cy + tilesize, cx, -1];
                if (x > 0)
                    if (map[y][x - 1] === 0)
                        corners[3][2] = 1;
            }

            edges[c++] = corners[0];
            edges[c++] = corners[1];
            edges[c++] = corners[2];
            edges[c++] = corners[3];
        }
        return edges;
        }
        
      function getShadowEndpoints(edges, px, py, screenX, screenY, tilesize)
      {
        var lineList = [];
        var lines = 0;
       
        lineList[lines++] = [0, 0, screenX-1, 0];
        lineList[lines++] = [screenX-1, 0, screenX-1, screenY-1];
        lineList[lines++] = [screenX-1, screenY-1, 0, screenY-1];
        lineList[lines++] = [0, screenY-1, 0, 0];

        // Check if we can draw lines between points.
        // Also check if edge is visible from the units point of view.
        // NEW: also store angle from unit
        //
        for (var i = 0; i < edges.length; i += 4)
        {
            if (edges[i][2] !== -1 && py <= edges[i][0])
                lineList[lines++] = [edges[i][1], edges[i][0], edges[i + 1][1], edges[i + 1][0], 0];
            
            if (edges[i + 1][2] !== -1 && px > edges[i + 1][1])
                lineList[lines++] = [edges[i + 1][1], edges[i + 1][0], edges[i + 2][1], edges[i + 2][0], 1];

            if (edges[i + 2][2] !== -1 && py > edges[i + 2][0])
                lineList[lines++] = [edges[i + 3][1], edges[i + 3][0], edges[i + 2][1], edges[i + 2][0], 2];

            if (edges[i + 3][2] !== -1 && px <= edges[i + 3][1])
                lineList[lines++] = [edges[i][1], edges[i][0], edges[i + 3][1], edges[i + 3][0], 3];
        }
        //return lineList;
        //
        //  MERGE LINES
        //  The drawback of this is when lines become too long and parts of them are outside the boundaries of
        //  the screen. The function should be rewritten to limit each line to 'n' segments.
        //
        var newLines = [];
        newLines.push(lineList[0]);
        newLines.push(lineList[1]);
        newLines.push(lineList[2]);
        newLines.push(lineList[3]);
       
        for (var i = 4; i < lineList.length; i++)
        {
            var k = 0;
            if (lineList[i][4] === -1)
                continue;

            // Loop through all lines to see if any line of the same type connect to line 'i'
            do
            {
                // Avoid comparing the same lines, and skip if current 'k' has been flagged for deletion.
                if (k === i || lineList[k][4] === -1)
                {
                    k++;
                    continue;
                }
                
                // Find all lines of the same type as 'i'
                if (lineList[i][4] === lineList[k][4])
                {
                    // Check if endpoint i:p1 is identical to k:p2
                    if (lineList[i][2] === lineList[k][0] && lineList[i][3] === lineList[k][1])
                    {
                        // Change line1 last endpoint to line2 last endpoint.
                        lineList[i][2] = lineList[k][2];
                        lineList[i][3] = lineList[k][3]; // shouldnt be needed
                        newLines.push(lineList[i]);
                        // Flag for deletion/skip
                        lineList[k][4] = -1;
                        k = 0;
                        continue;
                    }
                }
                k++;
            } while (k < lineList.length);
        }
        
        // Put all the merge lines into a new list.
        for (var i = 0; i < lineList.length; i++)
        {
            if (lineList[i][4] === 0 || lineList[i][4] === 2)
            {
                var len = lineList[i][2] - lineList[i][0];
                if (len === tilesize)
                    newLines.push(lineList[i]);
            }
            if (lineList[i][4] === 1 || lineList[i][4] === 3)
            {
                var len = lineList[i][3] - lineList[i][1];
                if (len === tilesize)
                    newLines.push(lineList[i]);
            }
        }
        
        //return newLines;
        
       // ---------------------------
        // Find all intersected points
        // ---------------------------
        var hitpoints = [];
        //px = unitpos[unit][1] + midx - posx;
        //py = unitpos[unit][0] + midy - posy;
        var endX, endY;
        var hitCounter = 0;
        for (var i = 0; i < lineList.length; i++)
        {
            var p1 = [lineList[i][0], lineList[i][1]];
            var p2 = [lineList[i][2], lineList[i][3]];

            // Fire a ray at each endpoint
            for (var j = 0; j < 2; j++)
            {
                var closest = [];
                if (j === 0) closest = p1;
                if (j === 1) closest = p2;
                
                endX = px + ((closest[0] - px) * 5);
                endY = py + ((closest[1] - py) * 5);

                var minDistance = Math.sqrt(Math.pow(closest[0] - px, 2) + Math.pow(closest[1] - py, 2));

                var ray = {x1: px, y1: py, x2: endX, y2: endY};
                var numHits = 0;
                for (var k = 0; k < lineList.length; k++)
                {
                    var wall = {x1: lineList[k][0], y1: lineList[k][1], x2: lineList[k][2], y2: lineList[k][3]};
                    var cross = intersection(ray, wall);
                    if (cross[0] !== -1)
                    {
                        var distance = Math.sqrt(Math.pow(cross[0] - px, 2) + Math.pow(cross[1] - py, 2));
                        if (distance <= minDistance)
                        {
                            // Check if it hits the endpoint without hitting any other walls.
                            // This means we have a clean hit and may want to keep scanning across the edge.
                            if (distance < minDistance)
                                numHits++; // unclean hit

                            closest = cross;
                            minDistance = distance;
                        }
                    }
                }
                // If numHits == 0 it means the ray hit it's target without any intersections. Only these
                // hitpoints are eligible for further rays.
                hitpoints[hitCounter++] = [closest[0], closest[1], numHits];
            }
        }
        
        // Remove duplicate endpoints.
        var out = [];
        var seen = {};
        var j = 0;
        for (var i = 0; i < hitpoints.length; i++)
        {
            var item = hitpoints[i];
            if (seen[item] !== 1)
            {
                seen[item] = 1;
                out[j++] = item;
            }
        }

        // Loop through all hitpoints, this time firing two additional rays to see if we can cross edges.
        numHits = 0;
        var hitsCounter = 0;
        var hitpoints3 = [];
        var xDiff, yDiff, rayAngle, minDistance;
        var res = [];
        for (var i = 0; i < out.length; i++)
        {
            // Only do this for the edges
            if (out[i][2] > 0)
                continue;
            
            xDiff = out[i][0] - px;
            yDiff = out[i][1] - py;
            rayAngle = Math.atan2(yDiff, xDiff);
            //minDistance = Math.sqrt(Math.pow(out[0] - px, 2) + Math.pow(out[1] - py, 2));
            //minDistance = 500;
            
            res = [out[i][0], out[i][1]];
            
            for (var rays = 0; rays < 2; rays++)
            {
                //minDistance = Math.sqrt(Math.pow(out[0] - px, 2) + Math.pow(out[1] - py, 2));
                minDistance = 1000;
                rayAngle = Math.atan2(yDiff, xDiff);
                if (rays === 0) rayAngle = rayAngle + 0.0001;
                if (rays === 1) rayAngle = rayAngle - 0.0001;
                endX = px + 1000 * Math.cos(rayAngle);
                endY = py + 1000 * Math.sin(rayAngle);

                var ray = {x1: px, y1: py, x2: endX, y2: endY};
                
                for (var k = 0; k < lineList.length; k++)
                {
                    var wall = {x1: lineList[k][0], y1: lineList[k][1], x2: lineList[k][2], y2: lineList[k][3]};
                    var cross = intersection(ray, wall);
                    if (cross[0] !== -1)
                    {
                        var distance = Math.sqrt(Math.pow(cross[0] - px, 2) + Math.pow(cross[1] - py, 2));
                        if (distance < minDistance)
                        {
                            res = cross;
                            minDistance = distance;
                        }
                    }
                }
                var xdiff = Math.abs(out[i][0] - res[0]);
                var ydiff = Math.abs(out[i][1] - res[1]);
                if (xdiff > 5 || ydiff > 5)
                    hitpoints3[hitsCounter++] = [res[0], res[1], numHits];
            }
        }

        // Put all endpoints in one array
        var endpoints = [];
        var c = 0;
        for (var i = 0; i < out.length; i++)
            endpoints[c++] = [out[i][0], out[i][1], 0];
        
        for (var i = 0; i < hitpoints3.length; i++)
            endpoints[c++] = [hitpoints3[i][0], hitpoints3[i][1], 0];

        // Calculate all the angles.
        for (var i = 0; i < endpoints.length; i++)
        {
            var xdiff = endpoints[i][0] - px;
            var ydiff = endpoints[i][1] - py;
            var angle = Math.atan2(ydiff, xdiff);
            endpoints[i][2] = angle;
        }

        endpoints.sort(function (a, b)
        {
           return a[2] - b[2]; 
        });
        
        return endpoints;
        }        
        
    // USED FOR SHADOWMAPPING
    // xtile and ytile: same as posx/posy, but added instead of recalculated (lazy)
    function scanCells(map, xtile, ytile, xradius, yradius)
    {
        // First check the 8 surrounding cells.
        var blocks = [], nb_x, nb_y, b = 0;
        for (var y = -yradius; y <= yradius; y++)
        {
            for (var x = -xradius; x <= xradius; x++)
            {
                nb_x = x + xtile;
                nb_y = y + ytile;
                
                // If we're outside the boundaries of the map, skip to next iteration.
                if (nb_x < 0 || nb_y < 0 || nb_x >= map[0].length - 1 || nb_y >= map.length - 1)
                    continue;
                
                // Dont do anything if we're in our own cell.
                if (x === 0 && y === 0)
                    continue;
                
                // If we hit a wall, add it to our array.
                if (map[nb_y][nb_x] === 2)
                    blocks[b++] = [nb_y, nb_x];
            }
        }
        return blocks;
    }

   function intersection(line1, line2) 
    {
        var p0x = line1.x1, p0y = line1.y1, p1x = line1.x2, p1y = line1.y2,
            p2x = line2.x1, p2y = line2.y1, p3x = line2.x2, p3y = line2.y2,
            d1x = p1x - p0x, d1y = p1y - p0y, d2x = p3x - p2x, d2y = p3y - p2y,
            d = d1x * d2y - d2x * d1y, ppx, ppy, s, t; 
    
        if (d === 0)
            return [-1, -1];

        // deltas between line1 p1 and line2 p1
        ppx = p0x - p2x;
        ppy = p0y - p2y;

        s = (d1x * ppy - d1y * ppx) / d;
        
        if (s >= 0 && s <= 1) 
        {
            t = (d2x * ppy - d2y * ppx) / d;
            if (t >= 0 && t <= 1)
                return [p0x + (t * d1x), p0y + (t * d1y)];
        }
        return [-1, -1];
    }


