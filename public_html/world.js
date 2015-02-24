/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var density = 0.61;
var iterations = 6;

function createWorld(map, worldWidth, worldHeight)
{
    for (var x = 0; x < worldWidth; x++)
    {
        map[x] = [];
        for (var y = 0; y < worldHeight; y++)
            map[x][y] = 0;
    }

    for (var y = 0; y < worldHeight; y++)
    {
        for (var x = 0; x < worldWidth; x++)
        {
            if (x === 0 || x === worldWidth - 1)
                map[x][y] = 1;
            if (y === 0 || y === worldHeight - 1)
                map[x][y] = 1;
            if (Math.random() > density)
                map[x][y] = 1;
        }
    }

    for (var i = 0; i < iterations; i++)
        map = doSimulationStep(map);

    createWalls(map);
    return map;
}

// Mark all walls with the map value '2'
function createWalls(map)
{
    //var n = [];
    for (var y = 0; y < map.length; y++)
    {
        for (var x = 0; x < map[0].length; x++)
        {
            if (map[y][x] === 1 && map[y][x] !== 2)
            {
                if (y > 0 && y < map.length - 1 && x > 0 && x < map[0].length - 1)
                {
                    if (map[y][x + 1] === 0 || map[y + 1][x] === 0)
                        map[y][x] = 2;
                    if (map[y][x - 1] === 0 || map[y - 1][x] === 0)
                        map[y][x] = 2;
                }
                if (y === 0) {
                    if (map[y + 1][x] === 0)
                        map[y][x] = 2;
                }
                if (y === map.length - 1) {
                    if (map[y - 1][x] === 0)
                        map[y][x] = 2;
                }
                if (x === 0) {
                    if (map[y][x + 1] === 0)
                        map[y][x] = 2;
                }
                if (x === map[0].length - 1) {
                    if (map[y][x - 1] === 0)
                        map[y][x] = 2;
                }
            }
        }
    }
}

function doSimulationStep(map)
{
    var deathLimit = 3;
    var birthLimit = 4;

    //Here's the new map we're going to copy our data into
    var newmap = [[]];
    for (var y = 0; y < map.length; y++)
    {
        newmap[y] = [];
        for (var x = 0; x < map[0].length; x++)
        {
            //Count up the neighbours
            var nbs = countAliveNeighbours(map, x, y);
            //If the tile is currently solid
            if (map[y][x] > 0)
            {
                //See if it should die
                if (nbs < deathLimit)
                    newmap[y][x] = 0;
                //Otherwise keep it solid
                else
                    newmap[y][x] = 1;
            }
            //If the tile is currently empty
            else
            {
                //See if it should become solid
                if (nbs > birthLimit)
                    newmap[y][x] = 1;
                else
                    newmap[y][x] = 0;
            }
        }
    }

    return newmap;
}

//This function counts the number of solid neighbours a tile has
function countAliveNeighbours(map, x, y)
{
    var count = 0;
    for (var i = -1; i < 2; i++)
    {
        for (var j = -1; j < 2; j++)
        {
            var nb_x = i + x;
            var nb_y = j + y;
            if (i === 0 && j === 0)
            {
            }
            //If it's at the edges, consider it to be solid (you can try removing the count = count + 1)
            else if (nb_x <= 0 || nb_y <= 0 || nb_x >= map[0].length - 2 || nb_y >= map.length - 2)
                count = count + 1;
            else if (map[nb_y][nb_x] === 1)
                count = count + 1;
        }
    }
    return count;
}
