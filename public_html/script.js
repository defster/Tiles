
$(document).ready(function()
{
    var context = canvas_draw.getContext('2d');

    var tipCanvas = document.getElementById("tip");
    var tipCtx = tipCanvas.getContext("2d");
    
    $('#canvas_draw').css('background-color', 'dimgrey');
    $('body').on('contextmenu', "#canvas_draw", function (e){ return false; });
    context.imageSmoothingEnabled = false;
    
    context.canvas.width = context.canvas.clientWidth;
    context.canvas.height = context.canvas.clientWidth * 0.6;
    var screenX = context.canvas.width;
    var screenY = context.canvas.height;
    // Mouse position in worldspace.
    var mouse_x, mouse_y;
    var mouse_x_tile, mouse_y_tile;

    var SHADOWS = true;
    
    // This value will always be the index of the currently selected unit.
    var unit = 0;
    var paths = [[]];
    var speed = 2;
    var tilesize = 32;
    var maxTilesX = (screenX / tilesize) | 0;
    var maxTilesY = (screenY / tilesize) | 0;
    var midx = (screenX / 2) | 0;
    var midy = (screenY / 2) | 0;
	
    var worldWidth = 128;
    var worldHeight = 128;
    var map = [[]];
    
    // Vars for map generation.
    //var iterations = 6;
    //var density = 0.65;
	
    // Create 6 random units. (name, race, job, lvl, friend/foe (0 or 1)
    for (var i = 0; i < 6; i++)
        addUnit("na", ((Math.random() * 5) + 1)|0, ((Math.random() * 6) + 1)|0, 10, 0);
    
    for (var i = 0; i < 20; i++)
        addUnit("Baddie"+i, ((Math.random() * 5) + 1)|0, ((Math.random() * 6) + 1)|0, 10, 1);
    
    /*
    units[0].name = "Ghil";
    units[1].name = "Leyra";
    units[2].name = "Krelian";
    units[3].name = "Aorn";
    units[4].name = "Nyme";
    units[5].name = "Oscon";
    */
    // Unit positions in tile-space.
    var unitpos = [[]];
    //var enemypos = [[]];

    startup();

    function hover()
    {
        for (var i = 0; i < units.length; i++)
        {
            var xt = (unitpos[i][1] / tilesize) | 0;
            var yt = (unitpos[i][0] / tilesize) | 0;
            if (xt === mouse_x_tile && yt === mouse_y_tile)
            {
                tipCanvas.style.left = (unitpos[i][1]) + midx - unitpos[unit][1] + 25 + "px";
                tipCanvas.style.top = (unitpos[i][0]) + midy - unitpos[unit][0] - 30 + "px";
                tipCtx.clearRect(0, 0, tipCanvas.width, tipCanvas.height);
                tipCtx.fillText(units[i].name + " [" + units[i].hp + "/" + units[i].maxhp + "]", 5, 15);
                //console.log("hovering over unit: ", i);
                return i;
            }
        }
        tipCanvas.style.left = -800 + "px";
        //tipCanvas.style.top = (unitpos[i][0]) + midy - unitpos[unit][0] + "px";
        return -1;
    }

    $(function () {
        var currentValue = $('#currentValue');
        $('#defaultSlider').change(function () 
        {
            currentValue.html(this.value);
        });
        // Trigger the event on load, so
        // the value field is populated:
        $('#defaultSlider').change();
    });

    // Where u1 attacks u2
    function calcDamage(u1, u2)
    {
        // The damage bonus/penalty from your STR to enemy's VIT for melee attack.
        var fStr = 0;
        
        // rank = weapon dps / 9 floored. weaponRank is -rank to +rank
        var weaponRank = 0;
        var fStrLowerCap = -weaponRank;
        var fStrUpperCap = weaponRank + 8;
        // 0 = str, 2 = vit. should make that array global..
        fStr = units[u1].stats['str'] - units[u2].stats['vit'];
        if (fStr < fStrLowerCap)
            fStr = fStrLowerCap;
        if (fStr > fStrUpperCap)
            fStr = fStrUpperCap;
        
        // TODO: fStr2 for ranged attack
        
        // Calculate base damage
        var baseDamage;
        var pDIF = 1; // *
        baseDamage = 5 + fStr; // HARDCODED
        
        // pDIF; attack vs defense difference
        
        var ratio = units[u1].stats['attack'] / units[u2].stats['defense'];
        //console.log("ratio: ", ratio);
        if (ratio > 2.25)
            ratio = 2.25;
        var levelDiff = units[u2].lvl - units[u1].lvl;
        if (levelDiff < 0)
            levelDiff = 0;
        //console.log("levelDiff: ", levelDiff);
        var cRatio = ratio - (0.05 * levelDiff);
        
        var r = cRatio;
        //console.log("cRatio: ", r);
        var b = 0;
        if (0 <= r && r <= 0.5)
            b = 1 + (10 / 9) * (r - 0.5);
        if (0.5 <= r && r <= 3/4)
            b = 1;
        if (3/4 <= r && r <= 2.25)
            b = 1 + (10 / 9) * (r - 3/4);
        
        //console.log("b max: ", b);
        
        var a = 0;
        if (r <= 0.5)
            a = 1/6;
        if (0.5 <= r && r < 1.25)
            a = 1 + (10 / 9) * (r - 1.25);
        if (1.25 <= r && r <= 1.5)
            a = 1;
        if (1.5 < r && r <= 2.25)
            a = 1 + (10 / 9) * (r - 1.5);
        
        //console.log("a min: ", a);
        
        var ra1 = 1/6;
        var randomizer = b - a;
        var ra2 = a + (Math.random() * randomizer);
        ra2 = Math.max(ra2, ra1);
        //console.log("random result; ", ra2);
        
        pDIF = ra2;
  
        // HIT CHANCE - Accuracy vs. Evasion
        
        var hitRate = 75; // percentile
        hitRate += ((units[u1].stats['accuracy'] - units[u2].stats['evasion']) * 0.5);
        
        var lvlDiff = units[u2].lvl - units[u1].lvl;
        
        if (lvlDiff < 0)
            lvlDiff = 0;
        var accPenalty = (lvlDiff * 4);
        hitRate -= (accPenalty * 0.5);
        hitRate = Math.floor(hitRate);
        
        if (hitRate < 20)
            hitRate = 20;
        if (hitRate > 95)
            hitRate = 95;
        
        
        var hit = Math.random() * 100;
        var evaded;
        if (hit > hitRate)
            evaded = true;
        else
            evaded = false;
        
        //console.log("pDIF: ", pDIF);
        var damage = Math.floor(baseDamage * pDIF);

        if (evaded)
            return [-1, hitRate];
        else
            return [damage, hitRate];
    }

    // Place each unit in the middle of their tile.
    function create_unitpos()
    {
        for (var i = 0; i < units.length; i++)
        {
            unitpos[i][1] = ((unitpos[i][1] * tilesize) + (tilesize / 2)) | 0;
            unitpos[i][0] = ((unitpos[i][0] * tilesize) + (tilesize / 2)) | 0;
        }
    }

    function actAttack(u)
    {
        if (units[u].targetUnit !== -1 && units[u].attackCooldownCur === 0)
        {
            var target = units[u].targetUnit;
            console.log(units[u].name + " tries to attack " + units[target].name + " id[" + target + "].");
            units[u].attackCooldownMax = 180;
            units[u].attackCooldownCur = 180;
            
            attack(u, target);
            
        }
    }

    // Clicking mouse on a tile creates a A* path for the selected unit.
    $("canvas").mousedown(function (e)
    {
        if (e.which === 3)
        {
            // Right-clicking initiates an attack.
            //actAttack(unit);
            /*
            if (units[unit].attackCooldownCur === 0)
            {
                //units[unit].attackCooldownMax = ((Math.random() * 180) + 50) | 0;
                units[unit].attackCooldownMax = 180; // 3 seconds ingame
                units[unit].attackCooldownCur = units[unit].attackCooldownMax;
                console.log(units[unit].name + " swings at");
            }
            */
            return;
        }
        else
        {
            var hover_unit = hover();
            if (hover_unit !== -1)
            {
                //console.log("Clicked on unit ", hover_unit);
                console.log(units[unit].name + " sets " + units[hover_unit].name + " id[" + hover_unit + "] as target.");
                units[unit].targetUnit = hover_unit;
                //Select_Unit(hover_unit);
                //unit = hover_unit;
            }
            else
                moveTo(unit, [mouse_y_tile, mouse_x_tile]);
                //units[unit].targetUnit = -1;
        }
    });

    function Select_Unit(u)
    {
        unit = u;
        draw_unitinfo(unit);
    }

    function moveTo(u, end)
    {
        // Find the tile our chosen unit is standing on.
        var start = [(unitpos[u][0] / tilesize) | 0, (unitpos[u][1] / tilesize) | 0];

        if (units[u].isMoving)
            units[u].initStop = true;
        else
        {
            paths[u] = findPath(map, start, end);

            // This was previously in the keypress function.
            if (paths[u].length > 1)
            {
                units[u].moveStep = 1;
                units[u].moveCounter = 0;
                units[u].isMoving = true;
            }
        }
    }

    $("canvas").mousemove(function (e)
    {
        var success = true;

        var rect = context.canvas.getBoundingClientRect();
        var midx = screenX / 2;
        var midy = screenY / 2;

        mouse_x = (e.pageX - rect.left + unitpos[unit][1] - midx) | 0;
        mouse_y = (e.pageY - rect.top + unitpos[unit][0] - midy) | 0;
        if (mouse_x < 0 || mouse_y < 0)
            success = false;

        if (mouse_x >= (map[0].length * tilesize) || mouse_y >= (map.length * tilesize))
            success = false;

        if (success === false)
        {
            mouse_x = mouse_y = -1;
            mouse_x_tile = mouse_y_tile = -1;
        }
        else
        {
            mouse_x_tile = (mouse_x / tilesize) | 0;
            mouse_y_tile = (mouse_y / tilesize) | 0;
        }
        
    });

   function draw_unitinfo(u)
    {
        var str;
        str = units[u].name + ", Lv." + units[u].lvl;
        str += " " + racenames[units[u].race];
        str += " " + jobnames[units[u].job].toUpperCase();

        //$("#unitname").text(str);
        /*
        str += ", Exp " + units[u].exp + "<br><br>";
        str += "hp " + units[u].maxhp + "/" + units[u].hp + "<br>";
        str += "mp " + units[u].maxmp + "/" + units[u].mp + "<br><br>";
        str += "str: " + units[u].stats['str'] + ", dex: " + units[u].stats['dex'] + ", vit: " + units[u].stats['vit'] + "<br>";
        str = str + "agi: " + units[u].stats['agi'] + ", int: " + units[u].stats['intl'] + ", mnd: " + units[u].stats['mnd'];
        str = str + ", chr: " + units[u].stats['chr'];

        str = str + "<br><br>";
        str = str + "attack: " + units[u].stats['attack'] + ", defense: " + units[u].stats['defense'] + "<br>";
        str = str + "accuracy: " + units[u].stats['accuracy'] + ", evasion: " + units[u].stats['evasion'];
        
        str += "<br><br>";
        str += "head...: ---<br>";
        str += "chest..: ---<br>";
        str += "weapon.: ---<br>";
        str += "shield.: ---<br>";
        str += "feet...: ---<br>";
        str += "rring..: ---<br>";
        str += "lring..: ---<br><br>";
        */
        str += "<br>atk cd: " + units[u].attackCooldownCur + "/" + units[0].attackCooldownMax + "<br>";
        str += "target_id: " + units[u].targetUnit;

        $("#unitinfo").html(str);
    }

    function placeUnits()
    {
        // Place units and enemies on valid tiles.
        var isGood = 1;
        for (var i = 0; i < units.length; i++)
        {
            var safety = 0;
            unitpos[i] = [];
            do
            {
                isGood = 1;

                // 40 is hardcoded. Remember, it must be less than worldsize.
                unitpos[i][1] = ((Math.random() * 40) + 4) | 0;
                unitpos[i][0] = ((Math.random() * 40) + 4) | 0;

                if (map[ unitpos[i][0] ][ unitpos[i][1] ] !== 0)
                    isGood = -1;

                for (var j = 0; j < i; j++)
                {
                    if (unitpos[i][1] === unitpos[j][1] && unitpos[i][0] === unitpos[j][0])
                    {
                        isGood = -1;
                        console.log("found dupe between " + (i + 1), (j + 1));
                    }
                }

                safety = safety + 1;
            } while (isGood === -1 && safety < 10);
        }

        context.textAlign = "center";
        context.textBaseline = "middle";

        for (var i = 0; i < units.length; i++)
        {
            units[i].stats = {str: 0, dex: 0, vit: 0, agi: 0, intl: 0, mnd: 0, chr: 0};
            units[i].vitals = {maxhp: 0, hp: 0, maxmp: 0, mp: 0};
        calc_stats(i);
        }
        create_unitpos();
    }

    function rand()
    {
        map = createWorld(map, worldWidth, worldHeight);

        // Prepare a multidimension array for unit paths.
        for (var i = 0; i < units.length; i++)
            paths[i] = [];

        placeUnits ();

        draw_unitinfo(0);
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
            {
                actAttack(unit);
            }
        }
    };

    // ---------------
    // MOVEMENT
    // ---------------
    var dist = [], deltax = [], deltay = [];
    function update_movement()
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
                    dist[u] = Math.sqrt(Math.pow(xp - unitpos[u][1], 2) + Math.pow(yp - unitpos[u][0], 2));

                    // Will be 1, or higher if diagonal movement.
                    offset = tilesize / dist[u];

                    //console.log("dist: ", dist, unitpos[u][1] - xp, unitpos[u][0] - yp);
                    ux = (unitpos[u][1] - xp);
                    uy = (unitpos[u][0] - yp);
                    if (ux !== 0)
                        deltax[u] = dist[u] / (unitpos[u][1] - xp);
                    else
                        deltax[u] = 0;
                    if (uy !== 0)
                        deltay[u] = dist[u] / (unitpos[u][0] - yp);
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
                unitpos[u][1] -= deltax[u];
                unitpos[u][0] -= deltay[u];
                units[u].moveCounter += speed;

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
        hover ();

        draw_unitinfo(unit);

        var posx = unitpos[unit][1];
        var posy = unitpos[unit][0];

        var posx_tile = (unitpos[unit][1] / tilesize) | 0;
        var posy_tile = (unitpos[unit][0] / tilesize) | 0;

        update_movement();

        // Clear the canvas
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Limit drawing to what will actually be on screen.
        var starty, startx, endy, endx;

        var maxx = (((screenX / tilesize) / 2) | 0) + 2;
        var maxy = (((screenY / tilesize) / 2) | 0) + 2;

        starty = posy_tile - maxy;
        startx = posx_tile - maxx;
        endy = posy_tile + maxy;
        endx = posx_tile + maxx;

        if (starty < 0) starty = 0;
        if (startx < 0) startx = 0;
        if (endy >= map.length) endy = map.length - 1;
        if (endx >= map[0].length) endx = map[0].length - 1;


        // Draw all visible tiles.
        context.fillStyle = "#bbbbbb";
        var drawx, drawy;
        for (var y = starty; y < endy; y++)
        {
            for (var x = startx; x < endx; x++)
            {
                drawx = (x * tilesize) + midx - posx;
                drawy = (y * tilesize) + midy - posy;
                if (map[y][x] > 0)
                    context.fillRect(drawx, drawy, tilesize, tilesize);
            }
        }
        
        // SHADOWMAPPING
        // Get a list of all surrounding walls ('2') from current unit tile.
        if (SHADOWS)
        {
            var n = scanCells(map, posx_tile, posy_tile, ((maxTilesX / 2) | 0) + 1, ((maxTilesY / 2) | 0) + 1);
            var edges = getEdges(map, n, midx - posx, midy - posy, tilesize);

            var px = unitpos[unit][1] + midx - posx;
            var py = unitpos[unit][0] + midy - posy;
            var endpoints = getShadowEndpoints(edges, px, py, screenX, screenY, tilesize);
            // Draw filled shadowvolume
            context.beginPath();
            //context.strokeStyle = "#00ff00";
            context.strokeStyle = 0;
            context.moveTo(endpoints[0][0], endpoints[0][1]);
            for (var i = 0; i < endpoints.length; i++)
                context.lineTo(endpoints[i][0], endpoints[i][1]);

            var rad2 = 300;
            var grd = context.createRadialGradient(screenX/2, screenY/2, 5, screenX/2, screenY/2, rad2);
            grd.addColorStop(0,"darkgrey");
            grd.addColorStop(1,"dimgrey");
            context.fillStyle = grd;
            //context.fillStyle = "grey";
            context.closePath();
            context.fill();
        }
        
 
        //
        //  DRAWING STUFFS
        //
        
        
        // Draw selection rectangle below mouse position.
        context.beginPath();
        context.strokeStyle = "#000000";
        context.rect(mouse_x_tile * tilesize + midx - posx + 1, mouse_y_tile * tilesize + midy - posy + 1, tilesize - 2, tilesize - 2);
        context.stroke();
        
        // Draw timer-bar above units head
        // shows Cooldown-timer
        context.fillStyle = "#ff0000";
        for (var i = 0; i < units.length; i++)
        {
            //if (units[i].type === 0)
            {
                // Check if unit is ON-SCREEN
                xx = unitpos[i][1] + midx - posx;
                yy = unitpos[i][0] + midy - posy;
                //context.rect(xx, yy - 30, 100, 15);
                var mx = 100; // base

                if (units[i].attackCooldownCur > 0)
                {
                    var steps = mx / units[i].attackCooldownMax;
                    units[i].attackCooldownCur = units[i].attackCooldownCur - 1;

                    mx = ((steps * units[i].attackCooldownCur)) | 0;

                    context.fillRect(xx, yy - 21, 100, 1);
                    context.fillRect(xx, yy - 20, mx, 7);

                }
            }
        }
        
        
        /*
        for (var i = 0; i < units.length; i++)
        {
            if (units[i].type === 0)
            {
                xx = unitpos[i][1] + midx - posx;
                yy = unitpos[i][0] + midy - posy;
                context.fillText(units[i].name, xx, yy);
            }
        }
        */
        /*
        // Draw visible walls
        context.beginPath();
        context.strokeStyle = "#000000";
        context.lineWidth = 0.5;
        for (var i = 0; i < lineList.length; i++)
        {
            context.moveTo(lineList[i][0], lineList[i][1]);
            context.lineTo(lineList[i][2], lineList[i][3]);
        }
        context.stroke();
        */
       
        // GRID?
        /*
        context.strokeStyle = "#999999";
        context.beginPath();
        for (var y = starty; y < endy; y++)
        {
            drawy = (y * tilesize) + midy - posy;
            context.moveTo(0, drawy);
            context.lineTo(screenX, drawy);
        }
        for (var x = startx; x < endx; x++)
        {
            drawx = (x * tilesize) + midx - posx;
            context.moveTo(drawx, 0);
            context.lineTo(drawx, screenY);
        }
        context.stroke();
        */

        // Draw circle on current UNIT
        context.beginPath();
        context.strokeStyle = "#00ff00";
        xx = unitpos[unit][1] + midx - posx;
        yy = unitpos[unit][0] + midy - posy;
        context.arc(xx, yy, 15, 0, Math.PI*2);
        context.stroke();

        // Draw circle on current units TARGET
        var tar = units[unit].targetUnit;
        if (tar !== -1)
        {
            context.strokeStyle = "#ff0000";
            context.beginPath();
            xx = unitpos[tar][1] + midx - posx;
            yy = unitpos[tar][0] + midy - posy;
            context.arc(xx, yy, 15, 0, Math.PI * 2);
            context.stroke();
        }

        // Draw unit IDs.
        var xx, yy;
        context.font = "12px Consolas";
        context.fillStyle = "lightgreen";
        for (var i = 0; i < units.length; i++)
        {
            if (units[i].type === 0)
            {
                xx = unitpos[i][1] + midx - posx;
                yy = unitpos[i][0] + midy - posy;
                context.fillText(units[i].name, xx, yy);
            }
        }
        context.font = "20px Consolas";
        context.fillStyle = "lightcoral";
        for (var i = 0; i < units.length; i++)
        {
            if (units[i].type === 1)
            {
                xx = unitpos[i][1] + midx - posx;
                yy = unitpos[i][0] + midy - posy;
                context.fillText("@", xx, yy);
            }
        }
        
    }
    
     // Funksjoner for å legge til enkelttall.
    $("#btn_1").click(function () {
        $("#input").val($("#input").val() + "1");
    });

    /*
    $(function ()
    {
        $(".source, .target").sortable({
            connectWith: ".connected"
        });
    });
    */
    window.setInterval(function ()
    {
    }, 8000);

    function attack(u1, u2)
    {
        this.units = units;
        var dam = calcDamage(u1, u2);
        if (dam[0] !== -1)
        {
            //console.log(units[u1].name + " attacks " + units[u2].name + " for " + dam[0] + " (" + dam[1] + "%) points of damage.");
            console.log(units[u1].name + " hits " + units[u2].name + " for " + dam[0] + " points of damage.");
            //dam[0] = 200;
            units[u2].hp -= dam[0];
            if (units[u2].hp < 1)
            {
                units[u2].hp = 0;
                units[u2].isDead = true;
                units[u1].targetUnit = -1;
                units[u1].exp += 100;
                console.log(units[u1].name + " defeated " + units[u2].name + "!");
                console.log(units[u1].name + " gains 100 experience points.");
                console.log("(deleting unit " + u2);
                units.splice(u2, 1);
                unitpos.splice(u2, 1);
                
            }
        }
        else
            //console.log(units[u1].name + " attacks " + units[u2].name + " (" + dam[1] + "%), but missed.");
            console.log(units[u1].name + " swings at " + units[u2].name + ", but misses.");
            
    }

    window.setInterval(function randMovement()
    {
        /*
        var c = [0, 0];

        for (var i = 0; i < 6; i++)
        {
            c = findRandomCell();

            // move unit 0 to c.
            if (!units[i].isMoving)
                moveTo(i, c);
        }
        */
        //console.log("cell: ", c[0], c[1]);
    }, 1000);

    // Returns x, y location of an empty cell. 
    /*
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
    */
    // Creates a html table using unit data. Should change this to bootstrap instead, so only single
    // values need to be updated.
    function update_party()
    {
        // fill datatable
        var r = [];
        var j = -1;
        /*
        r[++j] = "<br><tr class='bg-primary'><td>#</td><td>Character Name</td><td>MaxHP</td><td>HP</td><td>MaxMP</td><td>MP</td><td>Job</td></tr>";
        for (i = 0; i < 6; i++)
        {
            r[++j] = "<tr><td>" + (i + 1) + "</td><td>";
            r[++j] = units[i].name;
            r[++j] = "</td><td>";
            r[++j] = units[i].vitals['maxhp'];
            r[++j] = "</td><td>";
            r[++j] = units[i].vitals['hp'];
            if (i === 3)
                r[++j] = "</td><td class=\"danger\">";
            else
                r[++j] = "</td><td>";

            r[++j] = units[i].vitals['maxmp'];
            r[++j] = "</td><td>";
            r[++j] = units[i].vitals['mp'];
            r[++j] = "</td><td>";
            r[++j] = jobnames[units[i].job];
            r[++j] = "</td></tr>";
        }
        $("#datatable").html(r.join(''));
        */
    };

    function render()
    {
        draw();
        requestAnimationFrame(render);
    }

    function startup()
    {
        rand();
        update_party();

        render();
    }

});

