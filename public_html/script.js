
// This is a test comment

$(document).ready(function()
{
    $('#canvas_draw').css('background-color', 'dimgrey');
    $('body').on('contextmenu', "#canvas_draw", function (e){ return false; });
    $('body').on('contextmenu', "#tip", function (e){ return false; });
    
    var gl;
    var context = canvas_draw.getContext('2d');

    //var tipCanvas = document.getElementById("tip");
    //var tipCtx = tipCanvas.getContext("2d");
    
    var img = new Image();
    img.src = 'tileset.png';
    
    context.canvas.width = context.canvas.clientWidth;
    context.canvas.height = context.canvas.clientWidth * 0.6;
    var rectCanvas = context.canvas.getBoundingClientRect();

    context.imageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    var screenX = context.canvas.width;
    var screenY = context.canvas.height;
    
    var scale = 1; // too soon?
    var rotation = false;

    // Mouse position in worldspace.
    var mouse_x, mouse_y;
    var pMouse_x, pMouse_y;
    var mouse_x_tile, mouse_y_tile;

    var SHADOWS = false;
    
    // This value will always be the index of the currently selected unit.
    var unit = 0;
    var paths = [[]];
    var speed = 2;
    var tilesize = 32;
    var maxTilesX = ((screenX / tilesize)/scale) | 0;
    var maxTilesY = ((screenY / tilesize)/scale) | 0;
    var midx = ((screenX / 2)/scale) | 0;
    var midy = ((screenY / 2)/scale) | 0;
	
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

    var fragmentShader = "precision mediump float;" +
                         "varying vec4 vColor;" +
                         "void main(void) {" +
                         "  gl_FragColor = vColor; }";
                      
    var vertexShader = "attribute vec3 aVertexPosition;" +
                       "attribute vec4 aVertexColor;" +
                       "uniform mat4 uMVMatrix;" +
                       "uniform mat4 uPMatrix;" +
                       "varying vec4 vColor;" +
                       "void main(void) {" +
                       "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);" +
                       "  vColor = aVertexColor; }";
                                              
    
    var shaderProgram;
    var mvMatrix = mat4.create();
    var mvMatrixStack = [];
    var pMatrix = mat4.create();

    initWebGL();
    initBuffers();
    startup();

    var rCube = 0;
    function renderWebGL()
    {
        rCube = rCube + 1.0;
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [0.0, 0.0, -8.0]);
        //mvPushMatrix();
        mat4.rotate(mvMatrix, degToRad(rCube), [1, 1, 1]);
        
        
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, cubeVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        
        //mvPopMatrix();
        
    }

    function initWebGL()
    {
        try
        {
            var canvas;
            canvas = document.getElementById("tip");
            gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            gl.canvas.width = gl.canvas.clientWidth;
            gl.canvas.height = gl.canvas.clientWidth * 0.6;
            gl.viewportWidth = gl.canvas.width;
            gl.viewportHeight = gl.canvas.height;
        } catch (e) {
        }
        if (!gl) {
            console.log("Could not initialize WebGL.");
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, getShader(gl.VERTEX_SHADER, vertexShader));
        gl.attachShader(shaderProgram, getShader(gl.FRAGMENT_SHADER, fragmentShader));
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) 
        {
            alert("Could not initialise shaders");
        }
        
        gl.useProgram(shaderProgram);
        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
        
        shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
        
        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        // done with shaders
        
    }
        
    function mvPushMatrix()
    {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }
    
    function mvPopMatrix()
    {
        if (mvMatrixStack.length === 0)
            throw "Invalid popMatrix!";
        mvMatrix = mvMatrixStack.pop();
    }
    
    function getShader(type, text) 
    {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw gl.getShaderInfoLog(shader);
        return shader;
    }
        
    function setMatrixUniforms()
    {
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    }
        
    function degToRad(degrees)
    {
        return degrees * Math.PI / 180;
    }
        
    var cubeVertexPositionBuffer;
    var cubeVertexColorBuffer;
    var cubeVertexIndexBuffer;
    function initBuffers()
    {
        cubeVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
        var vertices = [
            // Front face
            -1.0, -1.0,  1.0,
             1.0, -1.0,  1.0,
             1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
             1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
             1.0, -1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0,  1.0,  1.0,
             1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        cubeVertexPositionBuffer.itemSize = 3;
        cubeVertexPositionBuffer.numItems = 24;
        
        cubeVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
        var colors = [
            [1.0, 0.0, 0.0, 1.0], // Front face
            [1.0, 1.0, 0.0, 1.0], // Back face
            [0.0, 1.0, 0.0, 1.0], // Top face
            [1.0, 0.5, 0.5, 1.0], // Bottom face
            [1.0, 0.0, 1.0, 1.0], // Right face
            [0.0, 0.0, 1.0, 1.0]  // Left face
        ];
        var unpackedColors = [];
        for (var i in colors)
        {
            var color = colors[i];
            for (var j = 0; j < 4; j++)
                unpackedColors = unpackedColors.concat(color);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
        cubeVertexColorBuffer.itemSize = 4;
        cubeVertexColorBuffer.numItems = 24;
        
        cubeVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
        var cubeVertexIndices = [
            0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
        ];
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
        cubeVertexIndexBuffer.itemSize = 1;
        cubeVertexIndexBuffer.numItems = 36;
    }
        
    function hover()
    {
        for (var i = 0; i < units.length; i++)
        {
            var xt = (unitpos[i][1] / tilesize) | 0;
            var yt = (unitpos[i][0] / tilesize) | 0;
            if (xt === mouse_x_tile && yt === mouse_y_tile)
            {
                //tipCanvas.style.left = (unitpos[i][1]) + midx - unitpos[unit][1] + 25 + "px";
                //tipCanvas.style.top = (unitpos[i][0]) + midy - unitpos[unit][0] - 30 + "px";
                //tipCtx.clearRect(0, 0, tipCanvas.width, tipCanvas.height);
                //tipCtx.fillText(units[i].name + " [" + units[i].hp + "/" + units[i].maxhp + "]", 5, 15);
                //console.log("hovering over unit: ", i);
                return i;
            }
        }
        //tipCanvas.style.left = -800 + "px";
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
            //console.log(units[u].name + " tries to attack " + units[target].name + " id[" + target + "].");
            units[u].attackCooldownMax = 180;
            units[u].attackCooldownCur = 180;
            
            attack(u, target);
            
        }
    }

    // Clicking mouse on a tile creates a A* path for the selected unit.
    canvas_draw.addEventListener('mousedown', function(e)
    //$("canvas").mousedown(function (e) // This one worked on ALL canvases - not good when i had more than one.
    {
        if (e.which === 3)
        {
            var hover_unit = hover();
            if (hover_unit !== -1)
            {
                //console.log(units[unit].name + " sets " + units[hover_unit].name + " id[" + hover_unit + "] as target.");
                units[unit].targetUnit = hover_unit;
            }
            else
                units[unit].targetUnit = -1;
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
            var tileNotEmpty = false;
            var xTile, yTile;
            for (var i = 0; i < units.length; i++)
            {
                xTile = (unitpos[i][1] / tilesize) | 0;
                yTile = (unitpos[i][0] / tilesize) | 0;
                if (yTile === mouse_y_tile && xTile === mouse_x_tile)
                    tileNotEmpty = true;
            }
            if (tileNotEmpty)
                console.log("Tile is occupied.");
            else
                moveTo(unit, [mouse_y_tile, mouse_x_tile]);
                //units[unit].targetUnit = -1;
        }
    }, false);

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

    function updateMouse()
    {
        var success = true;

        mouse_x = (pMouse_x - rectCanvas.left + unitpos[unit][1] - midx) | 0;
        mouse_y = (pMouse_y - rectCanvas.top + unitpos[unit][0] - midy) | 0;
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
    }

    canvas_draw.addEventListener('mousemove', function(e)
    {
        pMouse_x = e.pageX / scale;
        pMouse_y = e.pageY / scale;
       //console.log(e); 
    }, false);

    /*
    $("canvas").mousemove(function (e)
    {
        pMouse_x = e.pageX;
        pMouse_y = e.pageY;
    });
    */
   function draw_unitinfo(u)
    {
        var str;
        str = units[u].name + ", Lv." + units[u].lvl;
        str += " " + racenames[units[u].race];
        str += " " + jobnames[units[u].job].toUpperCase();
        /*
        str += ", Exp " + units[u].exp + "<br><br>";
        str += "hp " + units[u].maxhp + "/" + units[u].hp + "<br>";
        str += "mp " + units[u].maxmp + "/" + units[u].mp + "<br><br>";
        str += "str: " + units[u].str + ", dex: " + units[u].dex + ", vit: " + units[u].vit + "<br>";
        str = str + "agi: " + units[u].agi + ", int: " + units[u].int + ", mnd: " + units[u].mnd;
        str = str + ", chr: " + units[u].chr;

        str = str + "<br><br>";
        str = str + "attack: " + units[u].attack + ", defense: " + units[u].defense + "<br>";
        str = str + "accuracy: " + units[u].accuracy + ", evasion: " + units[u].evasion;
        
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
        if (units[u].targetUnit !== -1)
            str += "target_id: " + units[u].targetUnit;

        $("#unitinfo").html(str);
    }

    function placeUnits()
    {
        // Place units and enemies on valid tiles.
        var isGood;
        for (var i = 0; i < units.length; i++)
        {
            unitpos[i] = [];
            do
            {
                isGood = 1;
                // 40 is hardcoded. Remember, it must be less than worldsize.
                unitpos[i][1] = ((Math.random() * 40) + 4) | 0;
                unitpos[i][0] = ((Math.random() * 40) + 4) | 0;

                if (map[ unitpos[i][0] ][ unitpos[i][1] ] !== 0)
                    isGood = -1;
                else
                    for (var j = 0; j < i; j++)
                        if (unitpos[i][1] === unitpos[j][1] && unitpos[i][0] === unitpos[j][0])
                            isGood = -1;

            } while (isGood === -1);
        }

        context.textAlign = "center";
        context.textBaseline = "middle";

        for (var i = 0; i < units.length; i++)
        {
            //units[i].stats = {str: 0, dex: 0, vit: 0, agi: 0, intl: 0, mnd: 0, chr: 0};
            //units[i].vitals = {maxhp: 0, hp: 0, maxmp: 0, mp: 0};
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
        renderWebGL();
        
        hover ();

        draw_unitinfo(unit);

        var posx = unitpos[unit][1];
        var posy = unitpos[unit][0];

        var posx_tile = (unitpos[unit][1] / tilesize) | 0;
        var posy_tile = (unitpos[unit][0] / tilesize) | 0;

        update_movement();
        updateMouse();

        // Clear the canvas
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Limit drawing to what will actually be on screen.
        var maxx = (((screenX / tilesize) / 2) | 0) + 2;
        var maxy = (((screenY / tilesize) / 2) | 0) + 2;

        var starty = posy_tile - maxy;
        var startx = posx_tile - maxx;
        var endy = posy_tile + maxy;
        var endx = posx_tile + maxx;

        if (starty < 0) starty = 0;
        if (startx < 0) startx = 0;
        if (endy >= map.length) endy = map.length - 1;
        if (endx >= map[0].length) endx = map[0].length - 1;

        // Draw all visible tiles.
        context.fillStyle = "#bbbbbb";
        var drawx, drawy;
        var tilesetX, tilesetY;
        for (var y = starty; y < endy; y++)
        {
            for (var x = startx; x < endx; x++)
            {
                drawx = (x * tilesize) + midx - posx;
                drawy = (y * tilesize) + midy - posy;
                
                if (rotation)
                {
                    drawx -= midx;
                    drawy -= midy;
                }
                
                //if (map[y][x] > 0)
                {
                    
                    if (map[y][x] === 2 || map[y][x] === 1)
                    {
                        tilesetX = 0*32;
                        tilesetY = 14*32;
                        //context.fillStyle = "#bbbbbb";
                    }
                    /*
                    if (map[y][x] === 1)
                    {
                        tilesetX = 8*32;
                        tilesetY = 13*32;
                    }
                    */
                    if (map[y][x] === 0)
                    {
                        tilesetX = 55*32;
                        tilesetY = 14*32;
                    }
                        //context.fillStyle = "#aa9999";
                    
                    //context.fillRect(drawx, drawy, tilesize, tilesize);
                    //if (map[y][x] !== 1)
                        context.drawImage(img, tilesetX, tilesetY, 32, 32, drawx, drawy, tilesize, tilesize);
                }
            }
        }
        
        // SHADOWMAPPING
        // Get a list of all surrounding walls ('2') from current unit tile.
        if (SHADOWS)
        {
            var n = scanCells(map, posx_tile, posy_tile, ((maxTilesX / 2) | 0) + 1, ((maxTilesY / 2) | 0) + 1);
            //var n = scanCells(map, posx_tile, posy_tile, ((maxTilesX / 2) | 0) - 3, ((maxTilesY / 2) | 0) - 3);
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

            context.globalCompositeOperation = "screen";
            var rad2 = 300;
            var grd = context.createRadialGradient(screenX/2, screenY/2, 5, screenX/2, screenY/2, rad2);
            grd.addColorStop(0,"grey");
            grd.addColorStop(1,"black");
            context.fillStyle = grd;
            //context.fillStyle = "grey";
            context.closePath();
            context.fill();
            context.globalCompositeOperation = "source-over";
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
        context.fillStyle = "#ff8844";
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

                    context.rect(xx-1, yy - 21, 102, 9);
                    context.fillRect(xx, yy - 20, mx, 7);

                }
            }
        }
        context.stroke();
        
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
        context.arc(xx, yy, tilesize/2, 0, Math.PI*2);
        context.stroke();

        // Draw circle on current units TARGET
        var tar = units[unit].targetUnit;
        if (tar !== -1)
        {
            context.strokeStyle = "#ff0000";
            context.beginPath();
            xx = unitpos[tar][1] + midx - posx;
            yy = unitpos[tar][0] + midy - posy;
            context.arc(xx, yy, tilesize/2, 0, Math.PI * 2);
            context.stroke();
        }

        // Draw unit IDs.
        var xx, yy;
        context.font = "12px Consolas";
        context.fillStyle = "lightgreen";
        var xt, yt;
        for (var i = 0; i < units.length; i++)
        {
            if (units[i].type === 0)
            {
                xx = unitpos[i][1] + midx - posx;
                yy = unitpos[i][0] + midy - posy;
                if (rotation)
                {
                    xx -= midx;
                    yy -= midy;
                }
                yt = 2*32;
                xt = 1*32;
                //context.fillText(units[i].name, xx, yy);
                context.drawImage(img, xt, yt, 32, 32, xx-(tilesize/2), yy-(tilesize/2), tilesize, tilesize);
            }
        }
        //context.font = "20px Consolas";
        context.fillStyle = "lightcoral";
        for (var i = 0; i < units.length; i++)
        {
            if (units[i].type === 1)
            {
                xx = unitpos[i][1] + midx - posx;
                yy = unitpos[i][0] + midy - posy;
                if (rotation)
                {
                    xx -= midx;
                    yy -= midy;
                }
                yt = 3*32;
                xt = 7*32;
                //context.fillText("@", xx, yy);
                context.drawImage(img, xt, yt, 32, 32, xx-(tilesize/2), yy-(tilesize/2), tilesize, tilesize);
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

    var rScale = 1;
    function render()
    {
        //context.save();
        //context.translate(screenX / 2, screenY / 2);
        //rScale = rScale + 0.01;
        //var r = (Math.sin(rScale));
        //midx = (screenX/2) / r;
        //midy = (screenY/2) / r;
        //context.scale(r, r);
        //context.translate(unitpos[unit][1] - midx, unitpos[unit][0] - midy);
        //context.translate(unitpos[unit][1] - midx, unitpos[unit][0] - midy);
        //context.transform(1, 0, 0, 1, -midx, -midy);
        //context.translate(midx, midy);
        
        //context.rotate(r);
        draw();
        //context.restore();
        requestAnimationFrame(render);
    }

    function startup()
    {
        rand();
        update_party();

        render();
    }

});

