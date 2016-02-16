
// This is a test comment
// 2.Aug 2015

$(document).ready(function()
{
    $('#canvas_draw').css('background-color', '#444444');
    $('body').on('contextmenu', "#canvas_draw", function (e){ return false; });
    //$('body').on('contextmenu', "#tip", function (e){ return false; });
    
    var context = canvas_draw.getContext('2d');

    // Load all tiles.
    //var img = new Image();
    //img.src = 'tileset.png';
    
    $('#canvas_draw').attr({width:922,height:533});
    $('#canvas_draw').css('width', '922px');
    $('#canvas_draw').css('height', '553px');
    
    // Set proper client size and store rect for mouse calculations.
    context.canvas.width = context.canvas.clientWidth;
    //context.canvas.height = context.canvas.clientWidth * 0.6;
    context.canvas.height = context.canvas.clientHeight;
    
    context.mozImageSmoothingEnabled = false;
    //context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
 
    // Used to subtract from mouse coords to get coords relative to the canvas only.
    var rectCanvas = context.canvas.getBoundingClientRect();

    // Store the canvas size.
    var screenX = context.canvas.width;
    var screenY = context.canvas.height;
    
    // Mouse position in worldspace.
    var mousePosX, mousePosY;
    var mouse_x, mouse_y;
    var pMouse_x, pMouse_y;
    var mouse_x_tile, mouse_y_tile;

    // Set them to a numeric value since they wont really be updated until the user moves the mouse-cursor for
    // the first time. This is to avoid NaN.
    pMouse_x = 0;
    pMouse_y = 0;

    // This value will always be the index of the currently selected unit.
    var unit = 0;
    
    // Used for each units A* path
    var paths = [[]];
    var tilesize = 32;
    var speed = (tilesize/8);
    var maxTilesX = (screenX / tilesize) | 0;
    var maxTilesY = (screenY / tilesize) | 0;
    var midx = (screenX / 2) | 0;
    var midy = (screenY / 2) | 0;
	
    var worldWidth = 64;
    var worldHeight = 64;

    var map = [];
    map.push({ x: 0, y: 0 });
    
    var SHADOWS = false;
    var shadowTileSize = 15;
    var shadowSize = (shadowTileSize * tilesize) - (tilesize / 2) // 10x10 tiles

    // Create 6 random units. (name, race, job, lvl, friend/foe (0 or 1)
    for (var i = 0; i < 6; i++)
        addUnit("na", ((Math.random() * 5) + 1)|0, ((Math.random() * 6) + 1)|0, 10, 0);
    
    for (var i = 0; i < 20; i++)
        addUnit("Baddie"+i, ((Math.random() * 5) + 1)|0, ((Math.random() * 6) + 1)|0, 10, 1);
    
    units[0].name = "Ghil";
    units[1].name = "Leyra";
    units[2].name = "Krelian";
    units[3].name = "Aorn";
    units[4].name = "Nyme";
    units[5].name = "Oscon";
    
    //initWebGL();
    //initBuffers();
    
    startup();

    // To be used when tilesize is variable (which is unlikely to ever happen..)
    function updateMainVariables()
    {
        speed = (tilesize/8);
        maxTilesX = screenX / tilesize;
        maxTilesY = screenY / tilesize;
    }

    // Get ID of unit under mouse cursor position in worldspace.
    function hover()
    {
        for (var i = 0; i < units.length; i++)
            if (units[i].xTile === mouse_x_tile && units[i].yTile === mouse_y_tile)
                return i;
        return -1;
    }

    function actAttack(u)
    {
        if (units[u].targetUnit !== -1 && units[u].attackCooldownCur === 0)
        {
            var target = units[u].targetUnit;
            //console.log(units[u].name + " tries to attack " + units[target].name + " id[" + target + "].");
            units[u].attackCooldownMax = 180;
            units[u].attackCooldownCur = 180;
            attack(u, target);
        }
    }
$('div').on('mousedown mouseup', function mouseState(e) {
    if (e.type == "mousedown") {
        {
        }
        //code triggers on hold
        //console.log("hold");
        
    }
});
    // Clicking mouse on a tile creates a A* path for the selected unit.
    canvas_draw.addEventListener('mousedown', function(e)
    //$("canvas").mousedown(function (e) // This one worked on ALL canvases - not good when i had more than one.
    {
        var tileNotEmpty, i;
        // r.click
        if (e.which === 3)
        {
            var hover_unit = hover();
            if (hover_unit !== -1)
                units[unit].targetUnit = hover_unit;
            else
                units[unit].targetUnit = -1;
            return;
        }
        else
        {
            // If user l.clicks anywhere, the unit starts moving that direction.
            units[unit].isMoving = true;
            units[unit].stepstaken = 0;
            units[unit].startx = units[unit].x;
            units[unit].starty = units[unit].y;
            units[unit].endx = mouse_x;
            units[unit].endy = mouse_y;
            /*
            tileNotEmpty = false;
            for (i = 0; i < units.length; i++)
                if (units[i].yTile === mouse_y_tile && units[i].xTile === mouse_x_tile)
                    tileNotEmpty = true;
            if (tileNotEmpty)
                console.log("Tile is occupied.");
            else
                moveTo(unit, [mouse_y_tile, mouse_x_tile]);
                */
        }
    }, false);

    function moveTo2(u)
    {
        var dist = Math.sqrt(Math.pow(units[u].endx - units[u].startx, 2) + Math.pow(units[u].endy - units[u].starty, 2));
        
        var distx = units[u].startx - units[u].endx;
        var disty = units[u].starty - units[u].endy;
    
        var speed = 1;
    
        var stepx = (distx / dist) * speed;
        var stepy = (disty / dist) * speed;
        var stepsneeded = distx / stepx;
        
        
        units[u].x -= stepx;
        units[u].y -= stepy;
        units[u].stepstaken++;

        // This should be consolidated somewhere.
        units[u].xTile = (units[u].x / tilesize) | 0;
        units[u].yTile = (units[u].y / tilesize) | 0;
        
        if (units[u].stepstaken > stepsneeded)
        {
            units[u].x = units[u].x | 0;
            units[u].y = units[u].y | 0;
            units[u].isMoving = false;
        }
    }

    function updateMovement2()
    {
        for (var i = 0; i < 6; i++)
        {
            if (units[i].isMoving)
            {
                moveTo2(i);
            }
        }
    }

    function moveTo(u, end)
    {
        // Find the tile our chosen unit is standing on.
        var start = [units[u].yTile, units[u].xTile];

        if (units[u].isMoving)
            units[u].initStop = true;
        else
        {
            // Use A* to find a path
            paths[u] = findPath(map, start, end);
            if (paths[u].length > 1)
            {
                units[u].moveStep = 1;
                units[u].moveCounter = 0;
                units[u].isMoving = true;
            }
        }
    }

    function updateMouse()
    {
        // Mouse coordinates in canvas-space
        mousePosX = pMouse_x - rectCanvas.left;
        mousePosY = pMouse_y - rectCanvas.top;
        
        // Mouse position in relative canvas-space => worldspace
        mouse_x = (pMouse_x - rectCanvas.left + units[unit].x - midx) | 0;
        mouse_y = (pMouse_y - rectCanvas.top + units[unit].y - midy) | 0;
        if (mouse_x < 0 || mouse_y < 0 || mouse_x >= (map[0].length * tilesize) || mouse_y >= (map.length * tilesize))
        {
            mouse_x = mouse_y = -1;
            mouse_x_tile = mouse_y_tile = -1;
        }
        else
        {
            mouse_x_tile = (mouse_x / tilesize) | 0;
            mouse_y_tile = (mouse_y / tilesize) | 0;
        }
        
        // Write output
        var str = "xpos: " + mouse_x + ", ypos: " + mouse_y;
        str = str + "<br>xtile: " + mouse_x_tile + ", ytile: " + mouse_y_tile;
        str = str + "<br>canvasMouseX: " + mousePosX + ", canvasMouseY: " + mousePosY;
        str = str + "<br>" + context.canvas.width + ", " + context.canvas.height;
        str = str + "<br>ux: " + units[unit].x + ", uy: " + units[unit].y;
        $("#debuginfo").html(str);
    }

    canvas_draw.addEventListener('mousemove', function(e)
    {
        pMouse_x = e.pageX;
        pMouse_y = e.pageY;
    }, false);

    function placeUnits()
    {
        // Place units and enemies on valid tiles.
        var isGood;
        for (var i = 0; i < units.length; i++)
        {
            do
            {
                isGood = 1;
                // 40 is hardcoded. Remember, it must be less than worldsize.
                units[i].x = ((Math.random() * 40) + 4) | 0;
                units[i].y = ((Math.random() * 40) + 4) | 0;

                //if (map[ unitpos[i][0] ][ unitpos[i][1] ] !== 0)
                if (map[ units[i].y ][ units[i].x ] !== 0)
                    isGood = -1;
                else
                    for (var j = 0; j < i; j++)
                        if (units[i].x === units[j].x && units[i].y === units[j].y)
                            isGood = -1;

            } while (isGood === -1);
        }

        for (var i = 0; i < units.length; i++)
            calc_stats(i);

        var mid = tilesize / 2;
        for (var i = 0; i < units.length; i++)
        {
            units[i].x = ((units[i].x * tilesize) + mid);
            units[i].y = ((units[i].y * tilesize) + mid);
            units[i].xTile = (units[i].x / tilesize) | 0;
            units[i].yTile = (units[i].y / tilesize) | 0;
        }
    }

    function createMap()
    {
        map = createWorld(map, worldWidth, worldHeight);

        // Prepare a multidimension array for unit paths.
        for (var i = 0; i < units.length; i++)
            paths[i] = [];

        placeUnits ();

        // SHOULD BE ON
        //draw_unitinfo(0);
    }

    // ---------------
    // MOVEMENT
    // ---------------
    var dist = [], deltax = [], deltay = [];
    function updateMovement()
    {
        // For now, assume 'path' remains untouched during movement. 
        // TODO: a) detach from tiles, b) support for 'speed'
        var x, y, xp, yp, offset, step, ux, uy;
        var halftile = tilesize / 2;
        for (var u = 0; u < units.length; u++)
        {
            if (units[u].isMoving)
            {
                // Get current step.
                step = units[u].moveStep;

                // Get tile coords for next destination.
                x = paths[u][step][1];
                y = paths[u][step][0];

                // Convert these into worldspace.
                xp = (x * tilesize) + halftile;
                yp = (y * tilesize) + halftile;

                // If movement is just being initiated.
                offset = 1;
                if (units[u].moveCounter === 0)
                {
                    dist[u] = Math.sqrt(Math.pow(xp - units[u].x, 2) + Math.pow(yp - units[u].y, 2));

                    // Will be 1, or higher if diagonal movement.
                    offset = tilesize / dist[u];

                    ux = (units[u].x - xp);
                    uy = (units[u].y - yp);
                    if (ux !== 0)
                        deltax[u] = dist[u] / (units[u].x - xp);
                    else
                        deltax[u] = 0;
                    if (uy !== 0)
                        deltay[u] = dist[u] / (units[u].y - yp);
                    else
                        deltay[u] = 0;

                    if (offset !== 1)
                    {
                        deltax[u] *= offset;
                        deltay[u] *= offset;
                    }

                    if (speed > 1)
                    {
                        deltax[u] *= speed;
                        deltay[u] *= speed;
                    }
                }

                // Here we assume there will be constant movement, ie. not check if deltas actually have values.
                units[u].x -= deltax[u];
                units[u].y -= deltay[u];
                units[u].moveCounter += speed;
                units[u].xTile = (units[u].x / tilesize) | 0;
                units[u].yTile = (units[u].y / tilesize) | 0;

                // Should compare to distance when i move out of tile-only movement.
                if (units[u].moveCounter >= tilesize)
                {
                    units[u].moveStep += 1;
                    units[u].moveCounter = 0;

                    if (units[u].moveStep >= paths[u].length || units[u].initStop)
                    {
                        units[u].initStop = false;
                        paths[u].length = 0;
                        units[u].moveStep = 0;
                        units[u].isMoving = false;
                    }
                }
            }
        }
    }


    function draw()
    {
        //renderWebGL();
        
        hover ();

        updateMouse();
        updateMovement2();

        // Store positions in vars to avoid constant array lookups.
        var posx = units[unit].x | 0;
        var posy = units[unit].y | 0;
        var posx_tile = units[unit].xTile;
        var posy_tile = units[unit].yTile;

        //updateMovement();

        // Clear the canvas
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Limit drawing to what will actually be on screen.
        var maxNumTilesX = (((screenX / tilesize) / 2) | 0) + 2;
        var maxNumTilesY = (((screenY / tilesize) / 2) | 0) + 2;

        var starty = posy_tile - maxNumTilesY;
        var startx = posx_tile - maxNumTilesX;
        var endy = posy_tile + maxNumTilesY;
        var endx = posx_tile + maxNumTilesX;

        if (starty < 0) starty = 0;
        if (startx < 0) startx = 0;
        if (endy >= map.length) endy = map.length - 1;
        if (endx >= map[0].length) endx = map[0].length - 1;

        // Draw all visible tiles.
        //context.fillStyle = "#bbbbbb";
        var drawx, drawy;
        var tilesetX, tilesetY;
        
        // DUMMY
        var tre = tilesize / 3;
        context.fillStyle = "#777777";
        for (var y = starty; y < endy; y++)
            for (var x = startx; x < endx; x++)
            {
                // Upper left coordiantes for each block.
                drawx = (x * tilesize) + midx - posx;
                drawy = (y * tilesize) + midy - posy;
                if (map[y][x] > 0)
                    context.fillRect(drawx, drawy, tilesize, tilesize);
            }
        
        // SHADOWMAPPING
        // Get a list of all surrounding walls ('2') from current unit tile.
        if (SHADOWS)
        {
            //var n = scanCells(map, posx_tile, posy_tile, ((maxTilesX / 2) | 0) + 1, ((maxTilesY / 2) | 0) + 1);
            var tmp_posx_tile = (mouse_x / tilesize) | 0;
            var tmp_posy_tile = (mouse_y / tilesize) | 0;
            var tmp_posx = mouse_x | 0;
            var tmp_posy = mouse_y | 0;
            var tmp_midx = mousePosX | 0;
            var tmp_midy = mousePosY | 0;
            var n = scanCells(map, tmp_posx_tile, tmp_posy_tile, shadowTileSize - 1, shadowTileSize - 1);
            //var n = scanCells(map, posx_tile, posy_tile, shadowTileSize - 1, shadowTileSize - 1);
            var edges = getEdges(map, n, tmp_midx - tmp_posx, tmp_midy - tmp_posy, tilesize);
            //var edges = getEdges(map, n, midx - posx, midy - posy, tilesize);

            var px = posx + tmp_midx - posx;
            var py = posy + tmp_midy - posy;
            var tmp_px = tmp_posx + tmp_midx - tmp_posx;
            var tmp_py = tmp_posy + tmp_midy - tmp_posy;
            
            var lineList = getLineList(edges, tmp_px, tmp_py, tilesize, shadowSize);
            //var lineList = getLineList(edges, px, py, tilesize, shadowSize);
            
            var result = getShadowEndpoints(lineList, tmp_px, tmp_py, tilesize, shadowSize);
            //var result = getShadowEndpoints(lineList, px, py, tilesize, shadowSize);
            var endpoints = result[0];
            var lineList = result[1];
            
            
            // Draw filled shadowvolume
            context.beginPath();
            context.strokeStyle = 0;
            context.moveTo(endpoints[0][0], endpoints[0][1]);
            for (var i = 0; i < endpoints.length; i++)
                context.lineTo(endpoints[i][0], endpoints[i][1]);

            context.globalCompositeOperation = "screen";
            var rad2 = shadowSize;
            
            var grd = context.createRadialGradient(tmp_midx, tmp_midy, 5, tmp_midx, tmp_midy, rad2);
            grd.addColorStop(0,"grey");
            grd.addColorStop(1,"#111111");
            context.fillStyle = grd;
            //context.fillStyle = "grey";
            context.closePath();
            context.fill();
            //context.globalCompositeOperation = "source-over";
            
        }
        
        //
        //  DRAWING STUFFS
        //
        
        // Draw selection rectangle below mouse position.
        context.beginPath();
        context.strokeStyle = "#000000";
        context.rect(mouse_x_tile * tilesize + midx - posx + 1, + mouse_y_tile * tilesize + midy - posy + 1, + tilesize - 2, tilesize - 2);
        context.stroke();
        
        // Draw timer-bar above units head, shows Cooldown-timer
        context.fillStyle = "#ff8844";
        for (var i = 0; i < units.length; i++)
        {
            if (units[i].attackCooldownCur > 0)
            {
                // Check if unit is ON-SCREEN
                xx = units[i].x + midx - posx;
                yy = units[i].y + midy - posy;
                var mx = 100; // base

                var steps = mx / units[i].attackCooldownMax;
                units[i].attackCooldownCur = units[i].attackCooldownCur - 1;

                mx = ((steps * units[i].attackCooldownCur)) | 0;

                context.rect(xx - 1, yy - 21, 102, 9);
                context.fillRect(xx, yy - 20, mx, 7);
            }
        }
        context.stroke();
        
        if (SHADOWS)
        {
            context.beginPath();
            context.strokeStyle = "#0000FF";
            context.lineWidth = 2;
            for (var i = 0; i < lineList.length; i++)
            {
                context.moveTo(lineList[i][0], lineList[i][1]);
                context.lineTo(lineList[i][2], lineList[i][3]);
            }
            context.stroke();
            context.lineWidth = 1;
        }
       
        // Draw circle on current UNIT
        context.beginPath();
        context.strokeStyle = "#00ff00";
        context.arc(units[unit].x + midx - posx, units[unit].y + midy - posy, tilesize/2, 0, Math.PI*2);
        context.stroke();

        // Draw circle on current units TARGET
        var tar = units[unit].targetUnit;
        if (tar !== -1)
        {
            context.strokeStyle = "#ff0000";
            context.beginPath();
            context.arc(units[tar].x + midx - posx, units[tar].y + midy - posy, tilesize/2, 0, Math.PI * 2);
            context.stroke();
        }

        // Draw units.
        context.font = "12px Consolas";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "lightgreen";
        for (var i = 0; i < 6; i++)
            context.fillText(units[i].name, units[i].x + midx - posx, units[i].y + midy - posy);
        context.fillStyle = "#dd4444";
        for (var i = 6; i < 20; i++)
            context.fillText(units[i].name, units[i].x + midx - posx, units[i].y + midy - posy);
    }
    
    function attack(u1, u2)
    {
        //this.units = units;
        var dam = calcDamage(u1, u2);
        if (dam[0] !== -1)
        {
            //console.log(units[u1].name + " attacks " + units[u2].name + " for " + dam[0] + " (" + dam[1] + "%) points of damage.");
            //console.log(units[u1].name + " hits " + units[u2].name + " for " + dam[0] + " points of damage.");
            //dam[0] = 200;
            units[u2].hp -= dam[0];
            if (units[u2].hp < 1)
            {
                units[u2].hp = 0;
                units[u2].isDead = true;
                units[u1].targetUnit = -1;
                units[u1].exp += 100;
                //console.log(units[u1].name + " defeated " + units[u2].name + "!");
                //console.log(units[u1].name + " gains 100 experience points.");
                //console.log("(deleting unit " + u2);
                units.splice(u2, 1);
                unitpos.splice(u2, 1);
                
            }
        }
        //else
            //console.log(units[u1].name + " attacks " + units[u2].name + " (" + dam[1] + "%), but missed.");
            //console.log(units[u1].name + " swings at " + units[u2].name + ", but misses.");
            
    }
 
    // Sends each unit to a random cell every n ms. Just for testing purposes.
    /*
    window.setInterval(function ()
    {
        for (var i = 0; i < 6; i++)
            if (i !== unit && !units[i].isMoving)
                    moveTo(i, findRandomCell());
    }, 1000);
    */
    // Returns x, y location of an empty cell. 
    function findRandomCell()
    {
        var x, y;
        var success = false;
        do
        {
            x = (Math.random() * worldWidth) | 0;
            y = (Math.random() * worldHeight) | 0;
 
            // Note that a 0 doesnt mean there will be a path. Some open areas are enclosed.
            if (map[y][x] === 0)
                success = true;
 
        } while (success === false);
 
        return [x, y];
    }
    
    // Creates a html table using unit data. Should change this to bootstrap instead, so only single
    // values need to be updated.
    // NB! This is currently only called once.
    function update_party()
    {
        // fill datatable
        var r = [];
        var j = -1;
        
        r[++j] = "<tr class='bg-primary'><td>#</td><td>Character Name</td><td>MaxHP</td><td>HP</td><td>MaxMP</td><td>MP</td><td>Job</td></tr>";
        for (i = 0; i < 6; i++)
        {
            r[++j] = "<tr><td>" + (i + 1) + "</td><td>";
            r[++j] = units[i].name;
            r[++j] = "</td><td>";
            r[++j] = units[i].maxhp;
            r[++j] = "</td><td>";
            r[++j] = units[i].hp;
            if (i === unit)
                r[++j] = "</td><td class=\"danger\">";
            else
                r[++j] = "</td><td>";

            r[++j] = units[i].maxmp;
            r[++j] = "</td><td>";
            r[++j] = units[i].mp;
            r[++j] = "</td><td>";
            r[++j] = jobnames[units[i].job];
            r[++j] = "</td></tr>";
            
        }
        $("#datatable").html(r.join(''));
        
    };

    function render()
    {
        draw();
        requestAnimationFrame(render);
    }

    function startup()
    {
        createMap();
        update_party();
        draw_unitinfo(unit);

        render();
    }
    
    // Change selected using through keyboard 1-6.
    window.onkeypress = function (event)
    {
        var key = event.keyCode;
        if (event.keyCode > 48 && event.keyCode < 55)
        {
            unit = event.keyCode - 49;
            draw_unitinfo(unit);
        }

        if (key === 97)
        {
            if (units[unit].targetUnit === -1)
                console.log(units[unit].name + " has no target.");
            else
                actAttack(unit);
        }
    };


});

