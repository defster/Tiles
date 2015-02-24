/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var jobnames = [ "na", "war", "thf", "mnk", "rdm", "whm", "blm" ];
var racenames = [ "na", "hume", "elvaan", "tarutaru", "mithra", "galka" ];


var units = [];

// type = 0 (friendly, in party), 1 (hostile), 2 (neutral)
function addUnit(name, race, job, lvl, type)
{
    units.push({ 
        name: name, lvl: lvl, job: job, race: race, exp: 0, 

        // Each time a modifier is applied or removed, all stats are recalculated.
        str: 0, dex: 0, vit: 0, agi: 0, int: 0, mnd: 0, chr: 0, atk: 0,
        acc: 0, def: 0, eva: 0, maxhp: 0, hp: 0, maxmp: 0, mp: 0,
        
        type: type,
        // Non-unit information still important to have. Not sure if x and y fit in here.
        x: 0, y: 0, xTile: 0, yTile: 0,
        isMoving: 0, isFighting: 0, isIdle: 0, isStopping: 0, isCasting: 0, isDead: 0,
        moveCounter: 0, moveStep: 0,
        targetUnit: -1,
        attackCooldownCur: 0, attackCooldownMax: 0
        
        //status: 0
    });
}

    // Calculate <level> stats for one unit. Currently no subjob.
    function calc_stats(u)
    {
        var JobScales =
                {
                    blm: {hp: 'f', mp: 'b', str: 'f', dex: 'c', vit: 'f', agi: 'c', intl: 'a', mnd: 'e', chr: 'd'},
                    mnk: {hp: 'a', mp: 'x', str: 'c', dex: 'b', vit: 'a', agi: 'f', intl: 'g', mnd: 'd', chr: 'e'},
                    thf: {hp: 'd', mp: 'x', str: 'd', dex: 'a', vit: 'd', agi: 'b', intl: 'c', mnd: 'g', chr: 'g'},
                    rdm: {hp: 'd', mp: 'd', str: 'd', dex: 'd', vit: 'e', agi: 'e', intl: 'c', mnd: 'c', chr: 'd'},
                    war: {hp: 'b', mp: 'x', str: 'a', dex: 'c', vit: 'd', agi: 'c', intl: 'f', mnd: 'f', chr: 'e'},
                    whm: {hp: 'e', mp: 'c', str: 'd', dex: 'f', vit: 'd', agi: 'e', intl: 'e', mnd: 'a', chr: 'c'}
                };

        var RaceScales =
                {
                    hume: {hp: 'd', mp: 'd', str: 'd', dex: 'd', vit: 'd', agi: 'd', intl: 'd', mnd: 'd', chr: 'd'},
                    elvaan: {hp: 'c', mp: 'e', str: 'b', dex: 'e', vit: 'c', agi: 'f', intl: 'f', mnd: 'b', chr: 'd'},
                    tarutaru: {hp: 'g', mp: 'a', str: 'f', dex: 'd', vit: 'e', agi: 'c', intl: 'a', mnd: 'e', chr: 'd'},
                    mithra: {hp: 'd', mp: 'd', str: 'e', dex: 'a', vit: 'e', agi: 'b', intl: 'd', mnd: 'e', chr: 'f'},
                    galka: {hp: 'a', mp: 'g', str: 'c', dex: 'd', vit: 'a', agi: 'e', intl: 'e', mnd: 'd', chr: 'f'}
                };

        var SkillScales =
                {
                    blm: { weapon: 'f', evasion: 'e' },
                    mnk: { weapon: 'b', evasion: 'b' },
                    thf: { weapon: 'c', evasion: 'a' },
                    rdm: { weapon: 'd', evasion: 'd' },
                    war: { weapon: 'a', evasion: 'c' },
                    whm: { weapon: 'e', evasion: 'e' }
                };
        
        
        var StatNames = ["str", "dex", "vit", "agi", "intl", "mnd", "chr"];
        var derivedStatNames = ["attack", "defense", "accuracy", "evasion", "m_accuracy", "m_attack", "m_defense", "m_evasion"];

        var HPScaleArray = {a: 9, b: 8, c: 7, d: 6, e: 5, f: 4, g: 3, x: 0};
        var HPBaseArray = {a: 19, b: 17, c: 16, d: 14, e: 13, f: 11, g: 10, x: 0};
        var HPScaleXXXArray = {a: 1, b: 1, c: 1, d: 0, e: 0, f: 0, g: 0, x: 0};

        var MPScaleArray = {a: 6, b: 5, c: 4, d: 3, e: 2, f: 1, g: 0.5, x: 0};
        var MPBaseArray = {a: 16, b: 14, c: 12, d: 10, e: 8, f: 6, g: 4, x: 0};

        var StatScaleArray = {a: 0.5, b: 0.45, c: 0.4, d: 0.35, e: 0.3, f: 0.25, g: 0.2, x: 0};
        var StatBaseArray = {a: 5, b: 4, c: 4, d: 3, e: 3, f: 2, g: 2, x: 0};

        var SkillBaseArray = {a: 6, b: 5, c: 5, d: 4, e: 4, f: 5, x: 0};
        var SkillScaleArray = {a: 3, b: 2.9, c: 2.8, d: 2.7, e: 2.5, f: 2.3, x: 0};

        var job = jobnames[units[u].job];
        var lvl = units[u].lvl;
        var lvl2 = lvl - 10;
        if (lvl2 < 0) lvl2 = 0;
        var lvl3 = lvl - 30;
        if (lvl3 < 0) lvl3 = 0;

        var HPScale, HPBase, HPScaleXXX;
        var MPScale, MPBase;

        // RACE HP
        var race = racenames[units[u].race];
        //console.log(race);
        HPScale = HPScaleArray[RaceScales[race]['hp']];
        HPBase = HPBaseArray[RaceScales[race]['hp']];
        HPScaleXXX = HPScaleXXXArray[RaceScales[race]['hp']];

        var race_hp = HPScale * (lvl - 1) + HPBase + 2 * lvl2 + HPScaleXXX * lvl3;

        // JOB
        var HPScale = HPScaleArray[JobScales[job]['hp']];
        var HPBase = HPBaseArray[JobScales[job]['hp']];
        var HPScaleXXX = HPScaleXXXArray[JobScales[job]['hp']];

        var job_hp = HPScale * (lvl - 1) + HPBase + 2 * lvl2 + HPScaleXXX * lvl3;

        var hp = race_hp + job_hp;

        // Set final HP values.
        //units[u].vitals['maxhp'] = hp;
        //units[u].vitals['hp'] = hp;
        units[u].maxhp = hp;
        units[u].hp = hp;

        // MP VALUES

        // Race
        MPScale = MPScaleArray[RaceScales[race]['mp']];
        MPBase = MPBaseArray[RaceScales[race]['mp']];
        var race_mp = MPScale * (lvl - 1) + MPBase;

        // Job
        MPScale = MPScaleArray[JobScales[job]['mp']];
        MPBase = MPBaseArray[JobScales[job]['mp']];
        var job_mp = MPScale * (lvl - 1) + MPBase;

        var mp = race_mp + job_mp;
        if (MPScale === 0)
            mp = 0;

        //units[u].vitals['maxmp'] = mp;
        //units[u].vitals['mp'] = mp;
        units[u].maxmp = mp;
        units[u].mp = mp;

        // STATS

        var sc, sb, rs, js, stat, t;
        for (var i = 0; i < StatNames.length; i++)
        {
            t = StatNames[i];
            sc = StatScaleArray[RaceScales[race][t]];
            sb = StatBaseArray[RaceScales[race][t]];
            rs = sc * (lvl - 1) + sb;
            sc = StatScaleArray[JobScales[job][t]];
            sb = StatBaseArray[JobScales[job][t]];
            js = sc * (lvl - 1) + sb;
            stat = rs + js;

            // Add the | 0 to clamp float to int.
            units[u].stats[t] = stat | 0;
        }
        
        //
        // SECONDARY STATS SHOULD NOT BE HERE
        //
        var skillRank = SkillScales[job].weapon;
        var r2 = (SkillScaleArray[skillRank] * lvl) + SkillBaseArray[skillRank];
        units[u].stats['combatskill'] = r2;
        skillRank = SkillScales[job].evasion;
        r2 = (SkillScaleArray[skillRank] * lvl) + SkillBaseArray[skillRank];
        units[u].stats['evasion'] = r2;
  
        units[u].stats['attack'] = Math.floor(8 + units[u].stats['combatskill'] + ((3 * units[u].stats['str']) / 4));
        units[u].stats['defense'] = Math.floor((units[u].stats['vit'] / 2) + 8 + lvl);
        
        // ACCURACY
        var acc = units[u].stats['combatskill'] + ((3 * units[u].stats['dex']) / 4 );
        units[u].stats['accuracy'] = Math.floor(acc);
        
        // Evasion is job-specific skill. How to deal?
        units[u].stats['m_accuracy'] = 0;
        units[u].stats['m_attack'] = 0;
        
    }

/*
 * columns[key] = {
        sortable: true,
        resizeable: true
    };
 * 
 * 
var arr = [];
var len = oFullResponse.results.length;
for (var i = 0; i < len; i++) {
    arr.push({
        key: oFullResponse.results[i].label,
        sortable: true,
        resizeable: true
    });
}
*/