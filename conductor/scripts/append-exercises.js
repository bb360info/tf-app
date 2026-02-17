const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../public/encyclopedia-data.json');
const RAW_TEXT = `
### **1. RAMP & Mobility (10 Exercises)**
*Focus: Joint mobilization, end-range activation, and specific tissue prep.*

| English Name | Russian Name | Description | Cue | Inventory | Sub-tags |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Verdun Low Walk** | Ходьба в полуприседе | Walk forward maintaining a half-squat depth; heels stay flat. | "Hips low, chest high." | None | warmup, mobility, pfaff |
| **Verdun Duck Walk** | Утиная ходьба | Deep squat walking, full knee flexion/extension cycle. | "Glutes to heels." | None | warmup, hips, pfaff |
| **Lunge Extension Walk** | Выпады с подъемом | Deep lunge, pause, then rise up high over the front leg before stepping. | "Deep, then tall." | None | warmup, mobility, pfaff |
| **Shin Box Switch** | Перекаты в седе 90/90 | Seated 90/90 leg position; rotate hips to switch knees to the other side without hands. | "Rotate from the hip socket." | None | warmup, hips, floor |
| **Knee Buffs** | Мини-приседания на одной ноге | Single-leg mini-squat (pistol) hovering the non-support leg. | "Knee over toe, balance." | None | warmup, activation, usatf |
| **Ankle Rocker Iso Hold** | Изометрия голеностопа | Deep dorsiflexion hold (knee over toe) with heel barely off ground. | "Load the spring." | None | warmup, ankle, static |
| **Banded Monster Walk** | Проходка с лентой | Diagonal forward walking with band around ankles/knees. | "Step wide and forward." | Mini-band | warmup, glutes |
| **Sand Pit Heel Walk** | Ходьба на пятках в песке | Walking in the sand pit exclusively on heels to tax dorsiflexors. | "Toes to the sky." | Sand Pit | warmup, ankle, sand |
| **Thoracic Extension on Roller** | Разгибание грудного отдела | Lying back over foam roller, extending spine (not lumbar). | "Open the chest." | Foam Roller | warmup, mobility |
| **Single Leg RDL** | Становая тяга на одной ноге | Hinge at hip on one leg, extending free leg back for balance. | "Teeter-totter flat back." | None | warmup, hamstring |

### **2. Technique (10 Exercises)**
*Focus: Curve mechanics, penultimate step, and arm action.*

| English Name | Russian Name | Description | Cue | Inventory | Sub-tags |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gallop Drill** | Галоп | Rhythmic pushing off the back leg to simulate penultimate step mechanics. | "Push, don't pull." | None | warmup, curve, technique |
| **Serpentine Run** | Бег змейкой | S-curve running to practice entering and exiting curves with lean. | "Lean from the ankles." | Cones | warmup, curve |
| **5-Step Rhythm Run** | 5-шаговый ритм | Approach rhythm practice counting 1-2-3-4-5 (no jump). | "Accelerate through 5." | Tape/Mark | warmup, approach |
| **Eye Flick Drill** | Тренировка взгляда | Run approach focusing eyes on check marks, shifting focus at specific steps. | "Mark, mark, vertical." | Tape | warmup, visual |
| **Knee Drive Hold** | Удержание маховой ноги | Static hold of the takeoff position (knee parallel) to build balance. | "Lock the drive." | None | warmup, static, technique |
| **One-Step Takeoff** | Отталкивание с одного шага | Walk one step and execute explosive vertical takeoff. | "Plant and punch." | None | warmup, takeoff |
| **1-2-3 Arm Action** | Работа рук 1-2-3 | Walking drill: Step R (arm fwd), Step L (arm back), Takeoff (double arm drive). | "Block the arms." | None | warmup, arms |
| **Penultimate Step Gallop** | Галоп предпоследнего шага | Continuous gallops emphasizing the "flat-flat" contact of the last two steps. | "Rolling contact." | None | warmup, rhythm |
| **Curve Wicket Run** | Бег по виражу с препятствиями | Running the J-curve over mini-hurdles/wickets to enforce frequency. | "Step over, lean in." | Wickets | warmup, curve, freq |
| **Circle Accelerations** | Ускорения по кругу | Accelerating from walk to sprint while maintaining a tight circle path. | "Inside shoulder down." | Cones | warmup, curve |

### **3. Plyometrics (10 Exercises)**
*Focus: Elasticity, stiffness, and reactive power (Lower intensity/Prep).*

| English Name | Russian Name | Description | Cue | Inventory | Sub-tags |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Star Jumps** | Звездные прыжки | Explosive jump spreading arms and legs wide in air. | "Get big in the air." | None | warmup, plyo, usatf |
| **Rocket Jumps** | Прыжки ракетой | Squat jump for maximal vertical height, fully extended body. | "Touch the sky." | None | warmup, vertical |
| **SL Box Push-off** | Толчок одной ногой с тумбы | Foot on low box, explosive drive up using only the box leg. | "Drive through the box." | Box (Low) | warmup, unilateral |
| **Lateral Box Push-off** | Боковой толчок с тумбы | Sideways stance, foot on box, drive vertically using adductors/glutes. | "Push straight down." | Box (Low) | warmup, lateral |
| **Zig-Zag Hops** | Прыжки зигзагом | Double leg hops moving diagonally forward (Z-pattern). | "Stick the landing." | Line/Tape | warmup, multidirectional |
| **Rudiment Jump (DL Lateral)** | Боковые прыжки (двумя ногами) | Small amplitude lateral jumps, keeping feet together (Pfaff). | "Springy ankles." | None | warmup, pfaff, lateral |
| **Rudiment Jump (SL Lateral)** | Боковые прыжки (одной ной) | Single leg lateral hops, low amplitude (Pfaff). | "Stable hip." | None | warmup, pfaff, unilateral |
| **4-Square Hops** | Прыжки по квадрату | Hops in a box pattern (Forward, Right, Back, Left). | "Quick ground contact." | Lines | warmup, coordination |
| **Sand Pit Toe Walking** | Ходьба на носках в песке | Walking on toes in sand to maximize calf/foot engagement. | "Stay high." | Sand Pit | warmup, foot strength |
| **Box Rebound (Low)** | Отскок с низкой тумбы | Drop from low box (6") and immediately jump vertical. | "Hot ground." | Box (Low) | warmup, reactive |

### **4. Strength & Core (10 Exercises)**
*Focus: Trunk stability and general force production.*

| English Name | Russian Name | Description | Cue | Inventory | Sub-tags |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MB Overhead Back Throw** | Бросок мяча назад из-за головы | Explosive triple extension throwing ball backward for height/distance. | "Explode and arch." | Med Ball | warmup, power, posterior |
| **MB Scoop Toss** | Бросок мяча снизу (между ног) | Throwing ball forward from between legs (Granny Toss). | "Hips forward." | Med Ball | warmup, power |
| **Rotational Wall Throw** | Вращательный бросок в стену | Standing side-on to wall, throw ball using hip rotation. | "Rotate the torso." | Med Ball | warmup, core, rotation |
| **V-Sits** | Складка (V-ситап) | Lying on back, fold body to touch hands to feet simultaneously. | "Snap up." | None | warmup, core, usatf |
| **Back Hypers** | Гиперэкстензия на полу | Lying prone, lift chest and legs off ground (Superman). | "Squeeze glutes/back." | None | warmup, core, posterior |
| **Copenhagen Plank** | Копенгагенская планка | Side plank with top leg on bench/partner, bottom leg hovering. | "Lift the bottom hip." | Bench | warmup, adductor |
| **Walking Lunge (MB Overhead)** | Выпады с мячом над головой | Walking lunge while holding med ball locked out overhead. | "Lock the elbows." | Med Ball | warmup, strength, stability |
| **Balance Board Squat** | Приседания на баланс-борде | Bodyweight squat performing on a wobble board/Bosu. | "Stabilize the ankles." | Bosu/Board | warmup, proprioception |
| **Med Ball Seated Twist** | Русский твист с мячом | Seated, feet off ground, rotating ball side to side (Russian Twist). | "Control the rotation." | Med Ball | warmup, core |
| **Front Loaders** | Броски мяча перед собой | Toss and catch heavy med ball in front of body (hot potato style). | "Brace the core." | Med Ball | warmup, core, pfaff |

### **5. Speed & Acceleration (10 Exercises)**
*Focus: Nervous system priming and acceleration mechanics.*

| English Name | Russian Name | Description | Cue | Inventory | Sub-tags |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Falling Start** | Падающий старт | Lean forward from standing until gravity forces a step, then sprint. | "Fall then drive." | None | warmup, accel |
| **MB Chase Sprint** | Спринт за мячом | Throw MB forward (chest pass), then sprint to catch/pass it. | "Throw and go." | Med Ball | warmup, reaction |
| **Resisted Marching** | Марш с сопротивлением | A-March with partner holding waist harness/band resistance. | "Drive knee, push floor." | Band/Belt | warmup, mechanics |
| **Sled Drag (Walk)** | Тяга саней (шагом) | Heavy sled drag walking, emphasizing full hip extension. | "Push the earth away." | Sled | warmup, power, posterior |
| **Stick Drill** | Бег по меткам | Acceleration run over sticks/tape spaced progressively further apart. | "Hit the sticks." | Sticks/Tape | warmup, rhythm, accel |
| **Push-Up Start** | Старт из упора лежа | Start sprint from a down push-up position on the ground. | "Push and drive." | None | warmup, accel, reaction |
| **Rolling Start (20m)** | Старт с хода | Jog 10m, then accelerate to 90% for 20m. | "Shift gears." | None | warmup, speed |
| **Ins-and-Outs** | Вход-выход | Sprint drill: Accelerate 20m, Float 20m, Accelerate 20m. | "Sprint, float, sprint." | Cones | warmup, speed change |
| **Downhill Sprint** | Бег под гору | Sprinting down a very slight decline (1-2 degrees) for turnover. | "Fast feet." | Hill/Slope | warmup, overspeed |
| **Partner Resisted Single Drive** | Одиночный выпад с сопротивлением | One explosive step against partner resistance, then reset. | "Explosive first step." | Band/Belt | warmup, accel, power |
`;

// Helper to convert English string to ID
function toId(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Helper to find existing ID by name or create new
function getOrCreateIndex(list, name, type) {
    const normName = name.trim();
    if (normName.toLowerCase() === 'none' || !normName) return null;

    // Check key mapping for common items
    const mappings = {
        'tape': 'tape_markers',
        'tape/mark': 'tape_markers',
        'line/tape': 'tape_markers',
        'lines': 'tape_markers',
        'sticks/tape': 'tape_markers',
        'mini-band': 'bands',
        'band/belt': 'harness',
        'foam roller': 'mat', // Approximate or add new? Let's add new if not found
        'box (low)': 'plyo_box',
        'hill/slope': 'track', // Close enough? No, let's make new if needed
    };

    let existingId = null;

    // Check manual mappings first
    if (mappings[normName.toLowerCase()]) {
        existingId = mappings[normName.toLowerCase()];
    } else {
        // Search in list
        const found = list.find(i => i.name.en?.toLowerCase() === normName.toLowerCase() || i.name.ru.toLowerCase() === normName.toLowerCase() || i.id === toId(normName));
        if (found) existingId = found.id;
    }

    if (!existingId) {
        // Create new
        existingId = toId(normName);
        // Check if ID already exists in list to avoid duplicates with different case
        if (!list.find(i => i.id === existingId)) {
            list.push({
                id: existingId,
                name: { ru: normName, en: normName, cn: normName } // Placeholder translations
            });
            console.log(`[NEW ${type}] Added: ${normName} -> ${existingId}`);
        }
    }
    return existingId;
}

try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // Map text categories to JSON IDs
    const categoryMap = {
        '1. RAMP & Mobility': 'warmup_activation',
        '2. Technique': 'technique_drills',
        '3. Plyometrics': 'plyometrics',
        '4. Strength & Core': 'strength_power',
        '5. Speed & Acceleration': 'speed_acceleration'
    };

    let currentCategory = null;
    let addedCount = 0;

    const sections = RAW_TEXT.split('### **');

    for (const section of sections) {
        if (!section.trim()) continue;

        const headerEnd = section.indexOf('**');
        const header = section.substring(0, headerEnd);
        const catKeys = Object.keys(categoryMap);
        const matchedKey = catKeys.find(k => header.includes(k));

        if (matchedKey) {
            currentCategory = categoryMap[matchedKey];
            console.log(`Processing Category: ${currentCategory}`);

            const rows = section.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---') && !l.includes('English Name'));

            for (const row of rows) {
                const cols = row.split('|').map(c => c.trim()).filter(c => c);
                if (cols.length < 6) continue;

                const [nameEn, nameRu, descEn, cueEn, inventoryRaw, tagsRaw] = cols;

                // Parse Inventory
                const inventory = [];
                const invItems = inventoryRaw.split(',').map(s => s.trim());
                invItems.forEach(item => {
                    const id = getOrCreateIndex(data.all_inventory, item, 'INVENTORY');
                    if (id) inventory.push(id);
                });

                // Parse Tags
                const tags = [];
                const tagItems = tagsRaw.split(',').map(s => s.trim());
                tagItems.forEach(item => {
                    const id = getOrCreateIndex(data.all_tags, item, 'TAG');
                    if (id) tags.push(id);
                });
                if (!tags.includes('warmup')) tags.push('warmup');

                const newExercise = {
                    name: {
                        ru: nameRu.replace(/\*\*/g, ''),
                        en: nameEn.replace(/\*\*/g, ''),
                        cn: nameEn.replace(/\*\*/g, '') // Placeholder CN
                    },
                    desc: {
                        ru: "См. описание.", // Placeholder or from source? Source has mixed langs.
                        // Actually, I have mappings in the table!
                        // The table columns are: English Name | Russian Name | Description | Cue | Inventory | Sub-tags
                        // Wait, the Description col in table is English.
                        ru: "Упражнение для разминки и подготовки.", // Default RU desc if not provided
                        en: descEn,
                        cn: "Warm-up exercise."
                    },
                    cue: {
                        ru: "Следи за техникой.",
                        en: cueEn.replace(/"/g, ''),
                        cn: "Watch your technique."
                    },
                    tags: tags,
                    inventory: inventory,
                    placeholder_text: descEn
                };

                const category = data.categories.find(c => c.id === currentCategory);
                if (category) {
                    category.exercises.push(newExercise);
                    addedCount++;
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
    console.log(`Successfully added ${addedCount} exercises.`);

} catch (e) {
    console.error(e);
}
