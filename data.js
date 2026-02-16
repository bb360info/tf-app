const CATEGORIES = {
  plyometric: { name: 'Плиометрика', nameEn: 'Plyometric', color: '#eb5757', icon: '⚡' },
  highjump: { name: 'Прыжок в высоту', nameEn: 'High Jump', color: '#2383e2', icon: '🏅' },
  strength: { name: 'Силовые', nameEn: 'Strength', color: '#9b51e0', icon: '🏋️' },
  gpp: { name: 'ОФП', nameEn: 'GPP', color: '#00a86b', icon: '🛡️' },
  speed: { name: 'Скорость', nameEn: 'Speed & Agility', color: '#f2994a', icon: '💨' },
  flexibility: { name: 'Гибкость', nameEn: 'Flexibility', color: '#56ccf2', icon: '🧘' },
  jump: { name: 'Прыгучесть', nameEn: 'Jump Dev', color: '#ff6b6b', icon: '🚀' }
};

const EQUIPMENT_TAGS = {
  bodyweight: { ru: 'Без инвентаря', en: 'Bodyweight' },
  barbell: { ru: 'Штанга', en: 'Barbell' },
  dumbbell: { ru: 'Гантели', en: 'Dumbbells' },
  kettlebell: { ru: 'Гиря', en: 'Kettlebell' },
  box: { ru: 'Тумба', en: 'Box' },
  band: { ru: 'Резинка', en: 'Band' },
  hurdles: { ru: 'Барьеры', en: 'Hurdles' },
  medball: { ru: 'Медбол', en: 'Med Ball' },
  pullupbar: { ru: 'Турник', en: 'Pull-up Bar' },
  mat: { ru: 'Мат/Яма', en: 'Mat/Pit' },
  sled: { ru: 'Сани', en: 'Sled' },
  cable: { ru: 'Блок', en: 'Cable' },
  machine: { ru: 'Тренажёр', en: 'Machine' },
  rope: { ru: 'Скакалка', en: 'Jump Rope' },
  foam: { ru: 'Ролл', en: 'Foam Roller' },
  trapbar: { ru: 'Трэп-гриф', en: 'Trap Bar' },
  rack: { ru: 'Стойка', en: 'Rack' },
  slantboard: { ru: 'Наклонная доска', en: 'Slant Board' },
  cones: { ru: 'Конусы', en: 'Cones' },
  wall: { ru: 'Стена', en: 'Wall' }
};

const EXERCISES = [
  // === PLYOMETRIC ===
  {
    id: 1, cat: 'plyometric', nameRu: 'Пого-прыжки (прыжки на стопе)', nameEn: 'Pogo Jumps', level: 'beginner', equipment: ['bodyweight', 'band'], img: 'images/pogo.png',
    descRu: 'Прыжки преимущественно за счёт голеностопа с минимальным сгибанием коленей. Цель — развитие жёсткости и реактивности нижней части ноги.',
    descEn: 'Jumping primarily using the ankle joint with knees kept stiff. Develops stiffness and reactivity in the lower leg.',
    descCn: '主要利用踝关节进行跳跃，膝关节保持刚性。发展小腿的刚性和反应力。',
    dosage: '2-3 × 15-30 повт.',
    muscles: ['calves', 'ankles'],
    coachRu: ['Минимизируй время контакта с землёй!', 'Пятки не касаются пола!', 'Отскакивай от земли с намерением!'],
    coachEn: ['Minimize ground contact time!', 'Don\'t let the heels touch the ground!', 'Rebound off the ground with intent!'],
    coachCn: ['减少触地时间！', '脚跟不要接触地面！', '有意识地从地面弹起！']
  },

  {
    id: 2, cat: 'plyometric', nameRu: 'Скакалка', nameEn: 'Jump Rope', level: 'beginner', equipment: ['rope'], img: 'images/jumprope.png',
    descRu: 'Непрерывные прыжки малой амплитуды с использованием скакалки. Развивает координацию и реактивную силу стопы.',
    descEn: 'Continuous low-amplitude jumps using a rope. Develops coordination and foot reactivity.',
    descCn: '使用跳绳进行连续小幅度跳跃。发展协调性和足部反应力。',
    dosage: '3 × 30-60 сек',
    muscles: ['calves', 'ankles'],
    coachRu: ['Плавность движений!', 'Жёсткие голеностопы!'],
    coachEn: ['Fluidity of movements!', 'Maintain stiff ankles!'],
    coachCn: ['动作要流畅！', '保持脚踝刚性！']
  },

  {
    id: 3, cat: 'plyometric', nameRu: 'Перескоки через мини-барьеры', nameEn: 'Ankle Flips Over Mini Hurdles', level: 'beginner', equipment: ['hurdles'], img: 'images/ankleflips.png',
    descRu: 'Перепрыгивание через низкие барьеры (20-40 см) за счёт работы голеностопа с минимальным сгибанием коленей.',
    descEn: 'Hopping over low barriers (20-40cm) using ankle flexion/extension with minimal knee bend.',
    descCn: '利用踝关节屈伸跳过低栏（20-40厘米），膝关节最小弯曲。',
    dosage: '3-5 × 5-10 повт.',
    muscles: ['calves', 'ankles'],
    coachRu: ['Жёсткие стопы!', 'Загребающее движение!'],
    coachEn: ['Stiff ankles!', 'Focus on the pawing action!'],
    coachCn: ['保持脚部刚性！', '专注扒地动作！']
  },

  {
    id: 4, cat: 'plyometric', nameRu: 'Присед-прыжок', nameEn: 'Squat Jump', level: 'intermediate', equipment: ['bodyweight'], img: 'images/squatjump.png',
    descRu: 'Из положения приседа (бёдра параллельны полу) выполнить взрывной прыжок вверх. Пауза между повторениями для устранения цикла растяжения-сокращения.',
    descEn: 'From squat position (thighs parallel), jump explosively upward. Reset between reps to focus on concentric power.',
    descCn: '从深蹲位置（大腿平行于地面）爆发性向上跳跃。每次之间重置，专注于向心力量。',
    dosage: '3-5 × 3-6 повт.',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Прыгни на максимальную высоту!', 'Полное взрывное усилие всего тела!'],
    coachEn: ['Jump to maximum height!', 'Full body expression of explosive power!'],
    coachCn: ['跳到最大高度！', '全身爆发力量！']
  },

  {
    id: 5, cat: 'plyometric', nameRu: 'Прыжок с колен', nameEn: 'Kneeling Jump', level: 'advanced', equipment: ['bodyweight', 'mat'], img: 'images/kneelingjump.png',
    descRu: 'Из положения на коленях взрывным разгибанием тазобедренных суставов выпрыгнуть и приземлиться на стопы в приседе.',
    descEn: 'Start kneeling. Explosively extend hips to jump up and land on feet in squat position.',
    descCn: '从跪姿开始，爆发性伸展髋关节跳起，以深蹲姿势落地。',
    dosage: '5 × 3 повт.',
    muscles: ['glutes', 'hip flexors'],
    coachRu: ['Агрессивно толкай бёдра вперёд!', 'Взрыв тазом!'],
    coachEn: ['Drive hips forward aggressively!', 'Explode with the hips!'],
    coachCn: ['积极向前推髋！', '髋部爆发！']
  },

  {
    id: 6, cat: 'plyometric', nameRu: 'Группировка в прыжке', nameEn: 'Tuck Jump', level: 'intermediate', equipment: ['bodyweight'], img: 'images/tuckjump.png',
    descRu: 'Прыжок вертикально с подтягиванием коленей высоко к груди в воздухе.',
    descEn: 'Jump vertically and pull knees high to chest in mid-air.',
    descCn: '垂直跳跃并在空中将膝盖高拉至胸部。',
    dosage: '3 × 6-8 повт.',
    muscles: ['quads', 'hip flexors', 'core'],
    coachRu: ['Колени к груди!', 'Обхвати колени руками!', 'Приземляйся вертикально!'],
    coachEn: ['Bring the knees to the chest!', 'Grasp knees with hands!', 'Land vertically!'],
    coachCn: ['膝盖到胸部！', '用手抓住膝盖！', '垂直着地！']
  },

  {
    id: 7, cat: 'plyometric', nameRu: 'Запрыгивание на тумбу', nameEn: 'Box Jump', level: 'intermediate', equipment: ['box'], img: 'images/boxjump.png',
    descRu: 'Прыжок с пола на тумбу. Фокус на концентрической мощности и механике приземления.',
    descEn: 'Jump from floor onto a box. Focus on concentric power and landing mechanics.',
    descCn: '从地面跳上跳箱。专注于向心力量和着地力学。',
    dosage: '5-8 × 3-5 повт.',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Прыгай максимально высоко каждый раз!', 'Мягкое приземление!'],
    coachEn: ['Jump as high as possible for every rep!', 'Soft landing!'],
    coachCn: ['每次都跳到最高！', '轻柔着地！']
  },

  {
    id: 8, cat: 'plyometric', nameRu: 'Прыжок в глубину', nameEn: 'Depth Jump', level: 'advanced', equipment: ['box'], img: 'images/depthjump.png',
    descRu: 'Шаг с тумбы (0.5-1.1м), приземление и немедленный прыжок на максимальную высоту. Ударный метод Верхошанского для стимуляции ЦНС и цикла растяжения-сокращения.',
    descEn: 'Step off box (0.5-1.1m), land and immediately jump as HIGH as possible. Shock method to stimulate CNS and SSC.',
    descCn: '从跳箱（0.5-1.1米）步下，着地后立即尽可能高地跳起。冲击法刺激中枢神经和牵张-缩短循环。',
    dosage: '3-5 × 3-6 повт.',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Мягкое приземление!', 'Прыгай максимально высоко!', 'Минимальное время контакта!'],
    coachEn: ['Land softly!', 'Jump as high as possible!', 'Minimize ground contact time!'],
    coachCn: ['轻柔着地！', '跳到最高！', '减少触地时间！']
  },

  {
    id: 9, cat: 'plyometric', nameRu: 'Дроп-прыжок', nameEn: 'Drop Jump', level: 'advanced', equipment: ['box'], img: 'images/dropjump.png',
    descRu: 'Шаг с тумбы (30-60 см) и мгновенный отскок. В отличие от depth jump, фокус на МИНИМИЗАЦИИ времени контакта с землёй.',
    descEn: 'Step off box (30-60cm) and rebound instantly. Focus on MINIMIZING ground contact time, not max height.',
    descCn: '从跳箱（30-60厘米）步下并立即反弹。专注于最小化触地时间，而非最大高度。',
    dosage: '2-4 × 5-10 повт.',
    muscles: ['calves', 'quads'],
    coachRu: ['Пол — это лава!', 'Жёсткие ноги!', 'Руки на бёдрах!'],
    coachEn: ['The floor is lava!', 'Legs stiff!', 'Hands on hips!'],
    coachCn: ['地面是岩浆！', '腿部保持刚性！', '双手放在臀部！']
  },

  {
    id: 10, cat: 'plyometric', nameRu: 'Прыжок в длину с места', nameEn: 'Standing Long Jump', level: 'beginner', equipment: ['bodyweight'], img: 'images/longjump.png',
    descRu: 'Прыжок с двух ног вперёд на максимальную длину с двойным махом руками.',
    descEn: 'Two-foot takeoff for maximum horizontal distance. Use double arm swing.',
    descCn: '双脚起跳，追求最大水平距离。使用双臂摆动。',
    dosage: '3-4 × 4-6 повт.',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Мощный мах руками!', 'Приземляйся сбалансированно!'],
    coachEn: ['Use a double arm swing!', 'Land balanced!'],
    coachCn: ['有力摆臂！', '平衡着地！']
  },

  {
    id: 11, cat: 'plyometric', nameRu: 'Многоскоки (баунд)', nameEn: 'Bounding', level: 'intermediate', equipment: ['bodyweight'], img: 'images/bounding.png',
    descRu: 'Утрированный беговой шаг с максимальной длиной каждого шага. Чередование ног.',
    descEn: 'Exaggerated running stride, striving for maximum distance with each step. Alternate legs.',
    descCn: '夸张的跑步步幅，每一步追求最大距离。双腿交替。',
    dosage: '3 × 8 повт. или 30-50м',
    muscles: ['glutes', 'quads', 'hip flexors'],
    coachRu: ['Прыгай вверх, а не только вперёд!', 'Зависай в воздухе!'],
    coachEn: ['Bound upwards, not just for distance!', 'Hang in the air!'],
    coachCn: ['向上弹跳，不只向前！', '在空中悬停！']
  },

  {
    id: 12, cat: 'plyometric', nameRu: 'Перепрыгивание барьеров', nameEn: 'Hurdle Hops', level: 'intermediate', equipment: ['hurdles'], img: 'images/hurdlehops.png',
    descRu: 'Серия прыжков на двух ногах через барьеры. Колени вверх, стопы на себя.',
    descEn: 'Jumping over a series of hurdles with feet together. Knees up, toes up.',
    descCn: '双脚并拢跳过一系列栏架。膝盖向上，脚尖向上。',
    dosage: '4-6 × 5-6 повт.',
    muscles: ['quads', 'hip flexors', 'calves'],
    coachRu: ['Колени вверх, стопы на себя!', 'Быстро от земли!'],
    coachEn: ['Knees up, toes up!', 'Quick off the ground!'],
    coachCn: ['抬膝，钩脚！', '快速离地！']
  },

  {
    id: 13, cat: 'plyometric', nameRu: 'Прыжки со штангой (трэп-гриф)', nameEn: 'Trap Bar Jumps', level: 'advanced', equipment: ['trapbar'], img: 'images/trapbarjump.png',
    descRu: 'Вертикальный прыжок с удержанием трэп-грифа или штанги (10-30% от макс.). Развитие мощности под нагрузкой.',
    descEn: 'Vertical jump while holding a trap bar or barbell loaded 10-30% of max.',
    descCn: '手持六角杠或杠铃（最大重量的10-30%）进行垂直跳跃。发展负重下的爆发力。',
    dosage: '3-5 × 3-5 повт.',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Взрывайся!', 'Приземляйся с согнутыми коленями!'],
    coachEn: ['Explode violently!', 'Land with knees bent!'],
    coachCn: ['爆发起跳！', '屈膝着地！']
  },

  {
    id: 14, cat: 'plyometric', nameRu: 'Бросок медбола в пол', nameEn: 'Medicine Ball Slam', level: 'beginner', equipment: ['medball'], img: 'images/medballslam.png',
    descRu: 'Бросок небаунсящего медицинбола в пол с максимальной силой. Тройное разгибание всего тела.',
    descEn: 'Slam a non-bouncing medicine ball into the ground with maximal force. Triple extension.',
    descCn: '以最大力量将不弹跳的药球砸向地面。三重伸展。',
    dosage: '3-5 × 5-10 повт.',
    muscles: ['core', 'shoulders', 'lats'],
    coachRu: ['Используй всё тело!', 'Тройное разгибание — взрыв!'],
    coachEn: ['Use the whole body!', 'Triple extension to generate force!'],
    coachCn: ['用全身力量！', '三重伸展产生力量！']
  },

  {
    id: 15, cat: 'plyometric', nameRu: 'Конькобежец (латеральные прыжки)', nameEn: 'Ice Skaters', level: 'beginner', equipment: ['bodyweight'], img: 'images/iceskaters.png',
    descRu: 'Прыжки в сторону с ноги на ногу, как движение конькобежца. Развитие латеральной мощности.',
    descEn: 'Jumping laterally from one foot to the other. Develops lateral power.',
    descCn: '从一只脚横向跳到另一只脚。发展横向爆发力。',
    dosage: '2 × 12-15 повт.',
    muscles: ['glutes', 'quads', 'adductors'],
    coachRu: ['Отталкивайся ребром стопы!', 'Контролируй приземление!'],
    coachEn: ['Push off the edges of the foot!', 'Control the landing!'],
    coachCn: ['用脚掌边缘推蹬！', '控制着地！']
  },

  // === HIGH JUMP SPECIFIC ===
  {
    id: 16, cat: 'highjump', nameRu: 'Бег по кругу', nameEn: 'Circle Runs', level: 'beginner', equipment: ['cones'], img: 'images/circleruns.png',
    descRu: 'Бег по кругу (радиус 3-8м) для развития умения управлять центробежной силой. Имитация дуги разбега. Наклон от центра при сохранении высоких бёдер.',
    descEn: 'Run in a circle (10-25ft radius) to manage centrifugal force. Simulates the high jump approach curve.',
    descCn: '沿圆形（半径3-8米）跑步，管理离心力。模拟跳高助跑弧线。',
    dosage: '3-5 × 2-3 круга',
    muscles: ['glutes', 'ankles', 'core'],
    coachRu: ['Толкайся наружу!', 'Беги высоко, не ломайся в поясе!', 'Стопы на одну линию!'],
    coachEn: ['Push to the outside!', 'Run tall, don\'t break at the waist!', 'Keep feet on a single track!'],
    coachCn: ['向外推蹬！', '保持高位跑姿！', '双脚踩在一条线上！']
  },

  {
    id: 17, cat: 'highjump', nameRu: 'Ножницы', nameEn: 'Scissor Jump', level: 'beginner', equipment: ['mat'], img: 'images/scissorjump.png',
    descRu: 'Прыжок через планку в положении ножниц (корпус вертикально, маховая нога вверх). Приземление стоя. Учит вертикальному отталкиванию.',
    descEn: 'Clear the bar in scissor motion (upright torso, lead leg up). Enforces vertical lift.',
    descCn: '以剪刀式动作越过横杆（躯干立直，摆动腿向上）。强化垂直起跳。',
    dosage: '4-8 повт. или 10-15 прыжков',
    muscles: ['glutes', 'hip flexors', 'calves'],
    coachRu: ['Стой прямо!', 'Маховая нога вверх, стопа на себя!', 'Не ныряй!'],
    coachEn: ['Stay upright!', 'Lead leg up, toes up!', 'Do not arch or dive!'],
    coachCn: ['保持直立！', '摆动腿向上，勾脚！', '不要前倾！']
  },

  {
    id: 18, cat: 'highjump', nameRu: 'Прыжки с 3-5 шагов', nameEn: 'Short Approach Jumps (3-5 step)', level: 'intermediate', equipment: ['mat'], img: 'images/shortapproach.png',
    descRu: 'Короткий разбег (3 или 5 шагов) для отработки механики отталкивания без скорости полного разбега. Многократное повторение упора и маха.',
    descEn: 'Short approach (3-5 steps) to isolate takeoff mechanics. High volume repetition of plant and drive.',
    descCn: '短助跑（3-5步）以分离起跳力学。大量重复练习插步和螱臂。',
    dosage: '8-15 прыжков',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Ускоряйся через последние два шага!', 'Колено к планке, потом прогиб!'],
    coachEn: ['Accelerate through the last two steps!', 'Knee to bar, then layout!'],
    coachCn: ['在最后两步加速！', '膝盖到达横杆，然后展体！']
  },

  {
    id: 19, cat: 'highjump', nameRu: 'Перекидка спиной (бэк-овер)', nameEn: 'Back-Over', level: 'intermediate', equipment: ['mat'], img: 'images/backover.png',
    descRu: 'Стоя спиной к планке, прыжок на двух ногах назад с прогибом через планку. Приземление на верхнюю часть спины.',
    descEn: 'Stand with back to bar, two-foot jump backwards, arch over bar. Land on upper back.',
    descCn: '背对横杆站立，双脚向后跳跃，弓身越过横杆。以上背部落地。',
    dosage: '10-15 прыжков',
    muscles: ['glutes', 'back', 'core'],
    coachRu: ['Прыгай ВВЕРХ, а потом назад!', 'Бёдра вверх!', 'Подбородок к груди при приземлении!'],
    coachEn: ['Jump UP then back!', 'Hips up!', 'Chin to chest for landing!'],
    coachCn: ['先向上跳，再向后！', '臀部向上！', '着地时下巴收向胸部！']
  },

  {
    id: 20, cat: 'highjump', nameRu: 'Мах коленом (поп-ап)', nameEn: 'Knee Drive Pop-Up', level: 'intermediate', equipment: ['bodyweight'], img: 'images/kneedrive.png',
    descRu: 'С короткого разбега (1-3 шага) взрывной мах коленом вверх для имитации отталкивания. Приземление на толчковую ногу.',
    descEn: 'Short approach (1-3 steps), drive knee up explosively to simulate takeoff.',
    descCn: '短助跑（1-3步），爆发性上提膝盖以模拟起跳。',
    dosage: '2 × 5-10 повт.',
    muscles: ['hip flexors', 'glutes', 'calves'],
    coachRu: ['Колено параллельно земле!', 'Стопа на себя!', 'Пробивай коленом!'],
    coachEn: ['Knee parallel to ground!', 'Toe dorsiflexed!', 'Punch the knee!'],
    coachCn: ['膝盖与地面平行！', '勾脚！', '冲击膝盖！']
  },

  {
    id: 21, cat: 'highjump', nameRu: 'Галоп (предпоследний шаг)', nameEn: 'Gallop / Penultimate Step Drill', level: 'intermediate', equipment: ['bodyweight'], img: 'images/gallop.png',
    descRu: 'Отработка ритма «длинный-короткий» последних двух шагов. Непрерывный галоп 20-30м с акцентом на быстрый плоский контакт.',
    descEn: 'Practice "long-short" rhythmic pattern of last two steps. Continuous gallop 20-30m.',
    descCn: '练习最后两步的“长-短”节奏模式。连续跳步 20-30米。',
    dosage: '4 × 30м',
    muscles: ['glutes', 'calves', 'hip flexors'],
    coachRu: ['Быстрый плоский контакт!', 'Опусти бёдра на предпоследнем, поднимись на толчковом!'],
    coachEn: ['Quick flat-flat foot contact!', 'Lower hips on penultimate, rise on takeoff!'],
    coachCn: ['快速平足接触！', '倒数第二步降低重心，起跳步升起！']
  },

  {
    id: 22, cat: 'highjump', nameRu: 'Прогиб / мост', nameEn: 'Back Arch / Bridge Drill', level: 'beginner', equipment: ['mat'], img: 'images/backarch.png',
    descRu: 'Лёжа на спине, разгибание в мост для мобилизации позвоночника. Подготовка к прогибу над планкой.',
    descEn: 'Push hips up into bridge to mobilize spine. Prepares for the flop arch.',
    descCn: '仰卧抬臀成桥形，活动脊柱。为背越弓身做准备。',
    dosage: '3 × 10-15 повт.',
    muscles: ['back', 'glutes', 'shoulders'],
    coachRu: ['Бёдра выше плеч!', 'Держи прогиб!'],
    coachEn: ['Hips higher than shoulders!', 'Hold the arch!'],
    coachCn: ['臀部高于肩部！', '保持拱形！']
  },

  {
    id: 23, cat: 'highjump', nameRu: 'Полный разбег (прокатка)', nameEn: 'Full Approach Run-Throughs', level: 'intermediate', equipment: ['mat', 'cones'], img: 'images/fullapproach.png',
    descRu: 'Полный разбег (8-12 шагов) без прыжка — пробегание мимо планки. Развитие уверенности в шаговом рисунке.',
    descEn: 'Full approach run (8-12 steps) but abort jump at end. Builds confidence in approach pattern.',
    descCn: '完整助跑（8-12步）但不跳跃。建立助跑模式的信心。',
    dosage: '10 повт. в начале каждой тренировки',
    muscles: ['full body'],
    coachRu: ['Ускоряйся непрерывно!', 'Не замедляйся в конце!'],
    coachEn: ['Accelerate continuously!', 'Do not slow down at the end!'],
    coachCn: ['持续加速！', '不要在最后减速！']
  },

  {
    id: 24, cat: 'highjump', nameRu: 'Сброс ног (кик-аут)', nameEn: 'Kick-Out Drill', level: 'intermediate', equipment: ['mat'], img: 'images/kickout.png',
    descRu: 'В прыжке (часто бэк-овер) на пике прогиба резко прижать подбородок к груди и выбросить голени вверх для перехода через планку.',
    descEn: 'At peak of arch, vigorously snap chin to chest and kick lower legs up to clear the bar.',
    descCn: '在弓身顶峰，用力将下巴收向胸部并向上踢腿以越过横杆。',
    dosage: '8-10 повт.',
    muscles: ['core', 'hip flexors'],
    coachRu: ['Подбородок к груди!', 'Реакция по времени!', 'Выстрели ногами!'],
    coachEn: ['Chin to chest!', 'Reaction timing!', 'Snap the legs!'],
    coachCn: ['下巴收向胸部！', '把握时机！', '弹出双腿！']
  },

  // === STRENGTH ===
  {
    id: 25, cat: 'strength', nameRu: 'Приседание со штангой', nameEn: 'Back Squat', level: 'intermediate', equipment: ['barbell', 'rack'], img: 'images/squat.png',
    descRu: 'Штанга на плечах, опускание до параллели бёдер. Взрывной подъём на носки. Не наклоняться вперёд как в гуд-морнинг.',
    descEn: 'Barbell on shoulders, lower until thighs parallel. Explode out of bottom to finish on toes.',
    descCn: '杠铃置于肩上，下蹲至大腿平行。从底部爆发起身，脚尖离地。',
    dosage: '3-5 × 3-10 повт.',
    muscles: ['quads', 'glutes', 'core'],
    coachRu: ['Взрывайся из нижней точки!', 'Плечи над бёдрами!'],
    coachEn: ['Explode out of the bottom!', 'Keep shoulders stacked over hips!'],
    coachCn: ['从底部爆发起身！', '肩部保持在髋部上方！']
  },

  {
    id: 26, cat: 'strength', nameRu: 'Фронтальный присед', nameEn: 'Front Squat', level: 'intermediate', equipment: ['barbell', 'rack'], img: 'images/frontsquat.png',
    descRu: 'Приседание со штангой на передней дельте. Более вертикальная позиция корпуса. Акцент на квадрицепсы.',
    descEn: 'Squat with barbell racked on front of shoulders. More upright torso. Quad emphasis.',
    descCn: '杠铃置于前三角肌上进行深蹲。躯干更加立直。重点锻炼股四头肌。',
    dosage: '3-4 × 3-6 повт.',
    muscles: ['quads', 'core'],
    coachRu: ['Выполняй максимально быстро!', 'Локти вверх!'],
    coachEn: ['Complete as fast as possible!', 'Elbows up!'],
    coachCn: ['尽可能快速完成！', '肘部向上！']
  },

  {
    id: 27, cat: 'strength', nameRu: 'Румынская тяга', nameEn: 'Romanian Deadlift', level: 'intermediate', equipment: ['barbell', 'dumbbell'], img: 'images/rdl.png',
    descRu: 'Наклон с отведением таза назад, лёгкое сгибание коленей. Гриф близко к ногам. Опускание до середины голени или ощущения растяжения задней поверхности.',
    descEn: 'Hinge hips backward, slight knee bend. Bar close to legs. Lower until mid-shin or hamstring stretch.',
    descCn: '髋关节向后铰链，膝关节轻微弯曲。杠铃贴近腿部。下降至小腿中部或感受到后侧链拉伸。',
    dosage: '3-4 × 6-10 повт.',
    muscles: ['hamstrings', 'glutes', 'lower back'],
    coachRu: ['Держи гриф близко к телу!', 'Гордая грудь!', 'Не округляй спину!'],
    coachEn: ['Keep the bar close!', 'Think proud chest!', 'Do not round the spine!'],
    coachCn: ['杠铃贴近身体！', '挺胸！', '不要弓背！']
  },

  {
    id: 28, cat: 'strength', nameRu: 'Становая тяга', nameEn: 'Deadlift', level: 'intermediate', equipment: ['barbell'], img: 'images/deadlift.png',
    descRu: 'Ноги на ширине плеч, хват грифа прямыми руками. Разгибание в тазобедренных суставах до полного выпрямления. Сжатие ягодиц наверху.',
    descEn: 'Feet shoulder-width, grip bar with straight arms. Drive hips forward to stand. Squeeze glutes at top.',
    descCn: '双脚与肩同宽，直臂握杠。髋部前推站立。在顶部收紧臀部。',
    dosage: '3-5 × 3-6 повт.',
    muscles: ['hamstrings', 'glutes', 'back', 'core'],
    coachRu: ['Представь, что сжимаешь карандаш между лопатками!', 'Отталкивай пол от себя!'],
    coachEn: ['Imagine squeezing a pencil between shoulder blades!', 'Press the ground away from you!'],
    coachCn: ['想象肩胛骨之间夹着铅笔！', '把地面推离你！']
  },

  {
    id: 29, cat: 'strength', nameRu: 'Болгарский сплит-присед', nameEn: 'Bulgarian Split Squat', level: 'intermediate', equipment: ['dumbbell', 'bench'], img: 'images/bulgariansplitsquat.png',
    descRu: 'Выпад с задней ногой на скамье. Вертикальный корпус. Глубокое опускание колена задней ноги к полу.',
    descEn: 'Rear foot elevated on bench. Hold weight at chest (goblet). Lower until front thigh is parallel.',
    descCn: '后脚抬高置于凳子上。手持重量于胸前。下降至前腿大腿平行。',
    dosage: '3 × 6 повт. на ногу',
    muscles: ['quads', 'glutes'],
    coachRu: ['Корпус вертикально!', 'Контролируй опускание!'],
    coachEn: ['Maintain upright torso!', 'Control the descent!'],
    coachCn: ['保持躯干直立！', '控制下降！']
  },

  {
    id: 30, cat: 'strength', nameRu: 'Тяга штанги в наклоне', nameEn: 'Barbell Bent-Over Row', level: 'intermediate', equipment: ['barbell'], img: 'images/barbellrow.png',
    descRu: 'Наклон корпуса вперёд, спина прямая. Тяга штанги к низу живота, сводя лопатки.',
    descEn: 'Hinge forward, row bar to abs with elbows tucked. Develops upper back.',
    descCn: '躯干前倾，肆部夹紧，将杠铃向腹部拉起。发展上背部。',
    dosage: '3-4 × 5-10 повт.',
    muscles: ['lats', 'rhomboids', 'biceps'],
    coachRu: ['Напряги кор!', 'Локти к себе!'],
    coachEn: ['Brace core!', 'Keep elbows tucked!'],
    coachCn: ['收紧核心！', '肘部夹紧！']
  },

  {
    id: 31, cat: 'strength', nameRu: 'Зашагивания на тумбу (взрывные)', nameEn: 'Step-Up (Explosive)', level: 'beginner', equipment: ['box'], img: 'images/stepup.png',
    descRu: 'Постановка ноги на тумбу и мощный подъём вверх с выносом колена свободной ноги. Акцент на опорную ногу.',
    descEn: 'Step onto box with lead leg. Shift weight forward so effort comes from top leg. Drive free knee.',
    descCn: '前脚踏上跳箱，重心前移，以前腿发力。摆动腿膝盖上提。',
    dosage: '3-4 × 6-10 повт. на ногу',
    muscles: ['quads', 'glutes'],
    coachRu: ['Не падай назад — финишируй наверху!', 'Мах коленом!'],
    coachEn: ['Don\'t fall backward — finish on top!', 'Use knee drive!'],
    coachCn: ['不要后倒——在顶部完成！', '膝盖上提！']
  },

  {
    id: 32, cat: 'strength', nameRu: 'Швунг жимовой', nameEn: 'Push Press', level: 'intermediate', equipment: ['barbell'], img: 'images/pushpress.png',
    descRu: 'Жим штанги с груди с помощью ног (подсед-выталкивание). Фиксация наверху.',
    descEn: 'Dip knees slightly and drive bar from shoulders to overhead explosively.',
    descCn: '膝关节微屈，爆发性地将杠铃从肩部推至头顶。',
    dosage: '3 × 8-10 повт.',
    muscles: ['shoulders', 'triceps', 'core'],
    coachRu: ['Ноги дают импульс!', 'Жёсткий кор!'],
    coachEn: ['Legs give the impulse!', 'Tight core!'],
    coachCn: ['腿部提供动力！', '核心收紧！']
  },

  {
    id: 33, cat: 'strength', nameRu: 'Взятие на грудь (Power Clean)', nameEn: 'Power Clean', level: 'advanced', equipment: ['barbell'], img: 'images/powerclean.png',
    descRu: 'Взрывной подъём штанги с пола на грудь. Мощное разгибание таза (тройное разгибание).',
    descEn: 'Lift bar from floor to shoulders in one explosive movement. Develops explosive power.',
    descCn: '一个爆发性动作将杠铃从地面举至肩部。发展爆发力。',
    dosage: '4-6 × 1-4 повт.',
    muscles: ['full body'],
    coachRu: ['Быстрое движение!', 'Разгибание тройное!'],
    coachEn: ['Fast movement!', 'Triple extension!'],
    coachCn: ['快速动作！', '三重伸展！']
  },

  {
    id: 34, cat: 'strength', nameRu: 'Ягодичный мост со штангой', nameEn: 'Barbell Hip Thrust', level: 'intermediate', equipment: ['barbell', 'box'],
    descRu: 'Верхняя часть спины на скамье, штанга на тазу. Выталкивание бёдер к потолку. Сжатие ягодиц наверху.',
    descEn: 'Upper back on bench, bar on pelvis. Thrust hips toward ceiling. Squeeze glutes at top.',
    descCn: '上背部靠在凳子上，杠铃置于髋部。向上推髋。在顶部收紧臀部。',
    dosage: '3 × 5-8 повт.',
    muscles: ['glutes', 'hamstrings'],
    coachRu: ['Сожми ягодицы наверху!', 'Подбородок прижат!'],
    coachEn: ['Squeeze glutes at the top!', 'Chin tucked!'],
    coachCn: ['在顶部收紧臀部！', '下巴内收！']
  },

  {
    id: 35, cat: 'strength', nameRu: 'Подтягивание', nameEn: 'Pull-Up', level: 'intermediate', equipment: ['pullupbar'],
    descRu: 'Вис на турнике, подтягивание подбородка выше перекладины. Можно с дополнительным весом.',
    descEn: 'Hang from bar, pull chin over bar. Can be weighted.',
    descCn: '悬垂于单杠，将下巴拉过杠。可加重。',
    dosage: '3 × 5-8 повт.',
    muscles: ['lats', 'biceps', 'core'],
    coachRu: ['Полная амплитуда!', 'Без раскачки!'],
    coachEn: ['Full range of motion!', 'No swinging!'],
    coachCn: ['全幅度运动！', '不要摇摆！']
  },

  {
    id: 36, cat: 'strength', nameRu: 'Махи гирей', nameEn: 'Kettlebell Swing', level: 'intermediate', equipment: ['kettlebell'],
    descRu: 'Отведение таза назад, мах гирей между ногами, резкое разгибание бёдер до уровня груди.',
    descEn: 'Hinge hips back, swing bell between legs. Thrust hips forward to swing to chest height.',
    descCn: '髋部后屈，壶铃在双腿间摆动。髋部前推将壶铃摆至胸部高度。',
    dosage: '3-5 × 8-15 повт.',
    muscles: ['glutes', 'hamstrings', 'core'],
    coachRu: ['Щёлкни бёдрами!', 'Не поднимай руками — всё от бёдер!'],
    coachEn: ['Snap hips forward!', 'Don\'t lift with upper body!'],
    coachCn: ['臀部发力弹出！', '不要用上半身抬！']
  },

  {
    id: 37, cat: 'strength', nameRu: 'Нордические сгибания', nameEn: 'Nordic Hamstring Curl', level: 'advanced', equipment: ['bodyweight', 'mat'],
    descRu: 'Стоя на коленях, стопы зафиксированы. Медленное падение вперёд, контролируя спуск задней поверхностью бедра.',
    descEn: 'Kneel, ankles held. Fall forward controlling descent with hamstrings. Use hands to push back.',
    descCn: '跪姿，脚踝固定。用后侧链控制身体前倾。用手推回。',
    dosage: '2-4 × 5 повт.',
    muscles: ['hamstrings'],
    coachRu: ['Прямая линия от колен до плеч!', 'Контролируй падение как можно дольше!'],
    coachEn: ['Straight line from knees to shoulders!', 'Control the fall as long as possible!'],
    coachCn: ['从膝盖到肩部保持直线！', '尽可能长时间控制下降！']
  },

  // === GPP ===
  {
    id: 38, cat: 'gpp', nameRu: 'Жим Паллофа', nameEn: 'Pallof Press', level: 'intermediate', equipment: ['band', 'cable'], img: 'images/pallofpress.png',
    descRu: 'Стоя боком к блоку/резине, жим рукоятки от груди вперёд, сопротивляясь вращению корпуса. Анти-ротация.',
    descEn: 'Anti-rotation hold while moving laterally. Resist band pulling toward anchor point.',
    descCn: '横向移动时保持抗旋转。抵抗弹力带向锚点方向的拉力。',
    dosage: '2 × 3 повт. на сторону',
    muscles: ['core', 'obliques'],
    coachRu: ['Сопротивляйся вращению!', 'Бёдра ровно!'],
    coachEn: ['Resist rotation!', 'Keep hips square!'],
    coachCn: ['抵抗旋转！', '保持髋部正面！']
  },

  {
    id: 39, cat: 'gpp', nameRu: 'V-скручивания', nameEn: 'V-Ups', level: 'intermediate', equipment: ['bodyweight'],
    descRu: 'Лёжа на спине, одновременный подъём рук и ног к центру, формируя букву V.',
    descEn: 'Lying on back, lift upper and lower body simultaneously into a V shape.',
    descCn: '仰卧，同时抬起上下半身形成V字形。',
    dosage: '3 × 15-20 повт.',
    muscles: ['core'],
    coachRu: ['Контролируй движение прессом!', 'Не раскачивай ноги!'],
    coachEn: ['Control with abdominal muscles!', 'Avoid swinging legs!'],
    coachCn: ['用腹肌控制动作！', '不要摆腿！']
  },

  {
    id: 40, cat: 'gpp', nameRu: 'Pallof пресс с шагами', nameEn: 'Pallof Press Lateral Steps', level: 'intermediate', equipment: ['band', 'cable'],
    descRu: 'Антиротационное удержание с боковыми шагами. Сопротивление вращению от резинки/блока.',
    descEn: 'Anti-rotation hold while moving laterally. Resist band pulling toward anchor point.',
    descCn: '横向移动时保持抗旋转。抵抗弹力带向锚点方向的拉力。',
    dosage: '2 × 3 повт. на сторону',
    muscles: ['core', 'obliques'],
    coachRu: ['Сопротивляйся вращению!', 'Бёдра ровно!'],
    coachEn: ['Resist rotation!', 'Keep hips square!'],
    coachCn: ['抵抗旋转！', '保持髋部正面！']
  },

  {
    id: 41, cat: 'gpp', nameRu: 'Изометрическое разгибание колена', nameEn: 'Isometric Knee Extension', level: 'beginner', equipment: ['machine'],
    descRu: 'Разгибание колена до ~60° и удержание. Используется для обезболивания и укрепления сухожилия надколенника (колено прыгуна).',
    descEn: 'Extend knee to ~60° and hold. Used for pain relief and patellar tendon stiffness (jumper\'s knee).',
    descCn: '将膝关节伸展至约60°并保持。用于缓解疼痛和體骬肌腱刚性（跳跃膝）。',
    dosage: '3-5 × 30-45 сек',
    muscles: ['quads', 'patellar tendon'],
    coachRu: ['Держи стабильно!', 'Для реабилитации сухожилия!'],
    coachEn: ['Hold steady!', 'For tendon rehab!'],
    coachCn: ['稳定保持！', '用于肌腱康复！']
  },

  {
    id: 42, cat: 'gpp', nameRu: 'Эксцентрические подъёмы на носки (Achilles)', nameEn: 'Eccentric Heel Drops', level: 'beginner', equipment: ['bodyweight'],
    descRu: 'Стоя на краю ступеньки, подъём на двух ногах, перенос веса на одну, медленное опускание пятки ниже уровня ступеньки.',
    descEn: 'Stand on step edge. Lift on two feet, transfer to one, slowly lower heel below step level.',
    descCn: '站在台阶边缘。双脚抬起，转移至单脚，慢慢将脚跟降低至台阶以下。',
    dosage: '3 × 15 повт.',
    muscles: ['calves', 'achilles'],
    coachRu: ['Поднимайся на двух, опускайся на одной!', 'Контролируй спуск!'],
    coachEn: ['Lift on two, lower on one!', 'Control the descent!'],
    coachCn: ['双脚抬起，单脚下降！', '控制下降速度！']
  },

  {
    id: 43, cat: 'gpp', nameRu: 'Терминальные разгибания колена (TKE)', nameEn: 'Terminal Knee Extensions', level: 'beginner', equipment: ['band'],
    descRu: 'Резинка за коленом, полное выпрямление ноги с сопротивлением. Укрепление VMO и реабилитация колена.',
    descEn: 'Band behind knee, straighten leg against resistance. Strengthens VMO and knee rehab.',
    descCn: '弹力带置于膝后，抵抗阻力伸直腿部。加强股内侧肌和膝关节康复。',
    dosage: '3 × 8-10 повт. ежедневно',
    muscles: ['quads', 'VMO'],
    coachRu: ['Сожми квадрицепс при полном разгибании!', 'Движение прямое!'],
    coachEn: ['Squeeze quads at full extension!', 'Ensure movement is straight!'],
    coachCn: ['在完全伸展时收紧股四头肌！', '确保动作笔直！']
  },

  {
    id: 44, cat: 'gpp', nameRu: 'Латеральные ходьба с резинкой', nameEn: 'Lateral Band Walks', level: 'beginner', equipment: ['band'],
    descRu: 'Боковая ходьба с мини-резинкой на голенях/над коленями. Укрепление отводящих мышц бедра.',
    descEn: 'Walk laterally with mini-band. Strengthens hip abductors.',
    descCn: '使用迷你弹力带横向行走。加强髋部外展肌。',
    dosage: '2 × 15 шагов в каждую сторону',
    muscles: ['glutes', 'hip abductors'],
    coachRu: ['Ноги широко!', 'Поддерживай натяжение резинки!'],
    coachEn: ['Keep feet wide!', 'Maintain tension on band!'],
    coachCn: ['双脚保持宽距！', '保持弹力带张力！']
  },

  {
    id: 45, cat: 'gpp', nameRu: 'Казачьи выпады', nameEn: 'Cossack Lunge', level: 'intermediate', equipment: ['bodyweight'],
    descRu: 'Боковой выпад с полным переносом веса на одну ногу, другая прямая. Развитие мобильности тазобедренного сустава.',
    descEn: 'Deep lateral lunge. Improves hip mobility and single-leg stability.',
    descCn: '深度侧弓步。改善髋关节灵活性和单腿稳定性。',
    dosage: '1-2 × 5 повт. на ногу',
    muscles: ['adductors', 'glutes', 'quads'],
    coachRu: ['Пятка опорной ноги на полу!', 'Глубже по мере контроля!'],
    coachEn: ['Keep supporting heel down!', 'Go deeper as control allows!'],
    coachCn: ['支撑脚脚跟着地！', '在可控范围内更深！']
  },

  {
    id: 46, cat: 'gpp', nameRu: 'Боковая планка с весом', nameEn: 'Weighted Side Plank', level: 'intermediate', equipment: ['dumbbell'],
    descRu: 'Боковая планка с дополнительным весом на верхнем бедре или плече.',
    descEn: 'Side plank with added weight on top hip or shoulder.',
    descCn: '侧平板支撑，在上方髋部或肩部加重。',
    dosage: '3 × 20 сек на сторону',
    muscles: ['obliques', 'core'],
    coachRu: ['Прямая линия от головы до пят!', 'Напряги кор!'],
    coachEn: ['Straight line from head to heels!', 'Brace the core!'],
    id: 44, cat: 'speed', nameRu: 'Старт с опорой на руку', nameEn: 'Crouch Start', level: 'beginner', equipment: ['bodyweight'], img: 'images/crouchstart.png',
    descRu: 'Старт из положения полуприседа, опора на одну руку. Агрессивный наклон вперёд.',
    descEn: 'Start from a crouched position, supporting with one hand. Aggressive forward lean.',
    descCn: '从半蹲位置起动，一只手支撑。积极前倾。',
    dosage: '3 × 20-30м',
    muscles: ['hamstrings', 'calves'],
    coachRu: ['Быстрые ноги на передней части стопы!', 'Бедро параллельно земле!'],
    coachEn: ['Fast feet on balls of feet!', 'Thigh parallel to ground!'],
    coachCn: ['前脚掌快速移动！', '大腿与地面平行！']
  },

  {
    id: 45, cat: 'speed', nameRu: '3-точечный старт', nameEn: '3-Point Start', level: 'intermediate', equipment: ['bodyweight'], img: 'images/3pointstart.png',
    descRu: 'Старт с опорой на одну руку и две ноги. Таз выше плеч. Развитие стартового разгона.',
    descEn: 'Start with one hand and two feet on the ground. Hips higher than shoulders. Develops initial acceleration.',
    descCn: '一只手和双脚触地起动。髋部高于肩部。发展初始加速能力。',
    dosage: '4-10 повт., вниз пешком',
    muscles: ['glutes', 'quads', 'calves'],
    coachRu: ['Спринт вверх, шагом вниз!', 'Мощные толчки!'],
    coachEn: ['Sprint up, walk down!', 'Powerful pushes!'],
    coachCn: ['冲刺上坡，步行下坡！', '有力推蹬！']
  },

  {
    id: 46, cat: 'speed', nameRu: 'Работа ног у стены', nameEn: 'Wall Drills (Posture)', level: 'beginner', equipment: ['wall'], img: 'images/walldrills.png',
    descRu: 'Упор руками в стену под углом. Отработка подъёма бедра и постановки стопы под центр тяжести.',
    descEn: 'Lean hands against a wall at an angle. Practice knee drive and foot placement under center of gravity.',
    descCn: '双手斜撑墙壁。练习抬膝和足部置于重心下方。',
    dosage: '5-6 × 30-50м',
    muscles: ['full body'],
    coachRu: ['Толкайся!', 'Взрывайся от земли!'],
    coachEn: ['Push! Explode off the ground!'],
    coachCn: ['推蹬！', '从地面爆发！']
  },

  // === SPEED ===
  {
    id: 47, cat: 'speed', nameRu: 'Бег с ходу (30м)', nameEn: 'Flying 30m', level: 'advanced', equipment: ['bodyweight'], img: 'images/flying30.png',
    descRu: 'Пробегание 30-метрового отрезка с максимальной скоростью после разгона.',
    descEn: 'Run a 30-meter segment at maximum speed after an acceleration phase.',
    descCn: '加速后以最大速度跑30米距离。',
    dosage: '3-5 × 10-30м зона',
    muscles: ['full body'],
    coachRu: ['Беги высоко, расслабь плечи!', 'Поддерживай скорость!'],
    coachEn: ['Run tall, relax shoulders!', 'Maintaining speed is key!'],
    coachCn: ['保持高位跑姿，放松肩膀！', '关键是维持速度！']
  },

  {
    id: 48, cat: 'speed', nameRu: 'Ускорения 20-60м', nameEn: 'Acceleration Sprints', level: 'beginner', equipment: ['cones'], img: 'images/acceleration.png',
    descRu: 'Короткие спринты с фокусом на набор скорости. Не искать быстрой частоты сразу, а выполнять мощные толчки.',
    descEn: 'Short sprints building speed. Execute powerful pushes rather than seeking quick leg speed immediately.',
    descCn: '短距离冲刺逐渐加速。执行有力的推蹬，而非立即追求快速频率。',
    dosage: '5-6 × 30-50м',
    muscles: ['full body'],
    coachRu: ['Толкайся!', 'Взрывайся от земли!'],
    coachEn: ['Push! Explode off the ground!'],
    coachCn: ['推蹬！', '从地面爆发！']
  },

  {
    id: 49, cat: 'speed', nameRu: 'А-подскок', nameEn: 'A-Skip', level: 'beginner', equipment: ['bodyweight'], img: 'images/askip.png',
    descRu: 'Ритмичные подскоки с высоким подъёмом колена и противоположной рукой. Развитие координации бега.',
    descEn: 'Rhythmic skip with high knee drive and opposite arm action.',
    descCn: '节奏性跳跃，高抓膝配合对侧手臂摆动。',
    dosage: '3 × 20-30м',
    muscles: ['hip flexors', 'calves'],
    coachRu: ['Колено вверх, стопа на себя!', 'Противоположная рука — противоположная нога!'],
    coachEn: ['Knee up, toe up!', 'Opposite arm, opposite leg!'],
    coachCn: ['抬膝，勾脚！', '对侧手臂配合对侧腿！']
  },

  {
    id: 50, cat: 'speed', nameRu: 'Б-подскок (загребание)', nameEn: 'B-Skip', level: 'intermediate', equipment: ['bodyweight'],
    descRu: 'Как А-подскок, но с разгибанием колена свободной ноги и активным «загребанием» земли стопой.',
    descEn: 'Like A-skip but with knee extension and active "clawing" the ground.',
    descCn: '类似A跳但加上膝关节伸展和主动“扒地”动作。',
    dosage: '3-5 × 20м',
    muscles: ['hip flexors', 'hamstrings', 'calves'],
    coachRu: ['Активное загребание стопой!', 'Стопа на себя!'],
    id: 50, cat: 'speed', nameRu: 'Бег с высоким подниманием бедра', nameEn: 'High Knees', level: 'beginner', equipment: ['bodyweight'], img: 'images/highknees.png',
    descRu: 'Бег на месте или с продвижением с акцентированным подъёмом бедра выше параллели.',
    descEn: 'Running in place or moving forward, emphasizing high knee drive above parallel.',
    descCn: '原地或向前跑动，强调高抬膝超过平行线。',
    dosage: '3 × 20-30м',
    muscles: ['hip flexors', 'quads', 'core'],
    coachRu: ['Колено вверх!', 'Быстрые ноги!'],
    coachEn: ['Knees up!', 'Fast feet!'],
    coachCn: ['抬膝！', '快脚！']
  },

  {
    id: 51, cat: 'speed', nameRu: 'Захлёст голени', nameEn: 'Butt Kicks', level: 'beginner', equipment: ['bodyweight'], img: 'images/buttkicks.png',
    descRu: 'Бег или подскоки с приведением пятки к ягодице. Развитие складывания ноги.',
    descEn: 'Running while bringing heel up to buttocks. Develops leg folding.',
    descCn: '跑步时将脚跟带向臀部。发展叠腿能力。',
    dosage: '3 × 20-30м',
    muscles: ['hamstrings', 'calves'],
    coachRu: ['Пятка к ягодице!', 'Быстрый контакт!'],
    coachEn: ['Heel to glute!', 'Quick contact!'],
    coachCn: ['脚跟触臀！', '快速接触！']
  },

  {
    id: 52, cat: 'speed', nameRu: 'Бег на прямых ногах', nameEn: 'Straight Leg Bounds', level: 'intermediate', equipment: ['bodyweight'], img: 'images/straightlegbounds.png',
    descRu: 'Активное сведение бёдер ("ножницы") с приземлением на переднюю часть стопы. Ноги прямые.',
    descEn: 'Active hip flexion ("scissors") landing on the balls of the feet. Legs remain straight.',
    descCn: '主动髋屈（“剪刀”）前脚掌着地。腿保持伸直。',
    dosage: '3-5 × 20м',
    muscles: ['hamstrings', 'glutes', 'hip flexors'],
    coachRu: ['Ноги прямые!', 'Активное загребание!'],
    coachEn: ['Legs straight!', 'Active clawing!'],
    coachCn: ['腿伸直！', '主动扒地！']
  },

  {
    id: 53, cat: 'flexibility', nameRu: 'Человек-паук (выпад с поворотом)', nameEn: 'Spiderman Lunge with Reach', level: 'beginner', equipment: ['bodyweight'], img: 'images/spiderman.png',
    descRu: 'Глубокий выпад с поворотом корпуса и вытягиванием руки вверх. Мобилизация бёдер и грудного отдела.',
    descEn: 'Deep lunge with torso rotation and reach to ceiling. Mobilizes hips and thoracic spine.',
    descCn: '深弓步配合躯干旋转和向上伸展。活动髋部和胸椎。',
    dosage: '1 × 5-6 повт. на сторону',
    muscles: ['hip flexors', 'thoracic spine'],
    coachRu: ['Тянись к потолку!', 'Задняя нога прямая!'],
    coachEn: ['Reach toward ceiling!', 'Keep back leg straight!'],
    coachCn: ['伸向天花板！', '后腿保持伸直！']
  },

  {
    id: 54, cat: 'flexibility', nameRu: 'Кошка-Корова', nameEn: 'Cat-Cow', level: 'beginner', equipment: ['bodyweight'], img: 'images/catcow.png',
    descRu: 'Стоя на четвереньках, поочерёдное прогибание и округление спины. Мобильность позвоночника.',
    descEn: 'On all fours, alternate between arching and rounding the back. Spinal mobility.',
    descCn: '四足支撑，交替进行弓背和圆背。脊柱灵活性。',
    dosage: '1 × 10-12 повт.',
    muscles: ['spine erectors', 'core'],
    coachRu: ['Дыши глубоко!', 'Двигайся плавно!'],
    coachEn: ['Breathe deeply!', 'Move smoothly!'],
    coachCn: ['深呼吸！', '平稳移动！']
  },

  {
    id: 55, cat: 'flexibility', nameRu: 'Махи ногой', nameEn: 'Leg Swings', level: 'beginner', equipment: ['bodyweight'], img: 'images/legswings.png',
    descRu: 'Маятниковые махи ногой вперёд-назад и в стороны для динамической растяжки бёдер.',
    descEn: 'Forward and sideways swings to dynamically stretch hip capsule.',
    descCn: '前后和侧向摆动，动态拉伸髋关节囊。',
    dosage: '2 × 10 повт. каждое направление',
    muscles: ['hip flexors', 'hamstrings', 'adductors'],
    coachRu: ['Контролируемое движение!', 'Постепенно увеличивай амплитуду!'],
    coachEn: ['Controlled motion!', 'Gradually increase range!'],
    coachCn: ['动作要可控！', '逐渐增大幅度！']
  },

  {
    id: 56, cat: 'strength', nameRu: 'Ягодичный мост на одной ноге', nameEn: 'Single Leg Glute Bridge', level: 'beginner', equipment: ['bodyweight'], img: 'images/singlelegglutebridge.png',
    descRu: 'Лёжа на спине, одна нога согнута, другая прямая. Подъём таза вверх за счёт опорной ноги.',
    descEn: 'Deep hip flexor and quad stretch. Rear foot against wall or on box.',
    descCn: '深度髋屈肌和股四头肌拉伸。后脚靠墙或置于箱上。',
    dosage: '1 × 45 сек на сторону',
    muscles: ['hip flexors', 'quads'],
    coachRu: ['Сожми ягодицу на стороне растяжки!'],
    coachEn: ['Squeeze glute on the stretching side!'],
    coachCn: ['收紧拉伸侧臀部！']
  },

  {
    id: 57, cat: 'strength', nameRu: 'Пожарный гидрант', nameEn: 'Fire Hydrant', level: 'beginner', equipment: ['bodyweight', 'band'], img: 'images/firehydrant.png',
    descRu: 'Стоя на четвереньках, отведение согнутой ноги в сторону. Контроль поясницы.',
    descEn: 'Yoga pose stretching glutes and external hip rotators.',
    descCn: '瑰伽动作拉伸臀肌和髋部外旋肌。',
    dosage: '2 × 30 сек на сторону',
    muscles: ['glutes', 'external rotators'],
    coachRu: ['Бёдра ровно к полу!'],
    coachEn: ['Keep hips square to the ground!'],
    coachCn: ['臀部保持正对地面！']
  },

  {
    id: 58, cat: 'strength', nameRu: 'Ракушка', nameEn: 'Clamshells', level: 'beginner', equipment: ['bodyweight', 'band'], img: 'images/clamshells.png',
    descRu: 'Лёжа на боку, колени согнуты. Раскрытие колена вверх, стопы вместе. Изоляция средней ягодичной.',
    descEn: 'Seated hip rotation drill. Both legs at 90°, rotate knees side to side.',
    descCn: '坐姿髋关节旋转练习。双腿90°，膝盖左右旋转。',
    dosage: '1 × 10 повт. на сторону',
    muscles: ['hip rotators'],
    coachRu: ['Корпус прямо!', 'Вращай колени из стороны в сторону!'],
    coachEn: ['Keep torso upright!', 'Rotate knees side to side!'],
    coachCn: ['保持躯干直立！', '膝盖左右旋转！']
  },

  {
    id: 59, cat: 'flexibility', nameRu: 'Скручивания сидя', nameEn: 'Seated Twist', level: 'beginner', equipment: ['bodyweight'], img: 'images/seatedtwist.png',
    descRu: 'Сидя, одна нога согнута и перекинута через другую. Поворот корпуса в сторону согнутой ноги.',
    descEn: 'Self-myofascial release with foam roller. Roll slowly on tight muscle groups.',
    descCn: '使用泡沫轴进行自我肌筋膜放松。在紧张肌群上缓慢滚动。',
    dosage: '30 сек на каждую зону',
    muscles: ['full body'],
    coachRu: ['Катай медленно!', 'Задерживайся на триггерных точках!'],
    coachEn: ['Roll slowly!', 'Pause on trigger points!'],
    coachCn: ['缓慢滚动！', '在触发点停留！']
  },

  // === JUMP DEVELOPMENT ===
  {
    id: 60, cat: 'flexibility', nameRu: 'Растяжка икр у стены', nameEn: 'Calf Stretch', level: 'beginner', equipment: ['wall'], img: 'images/calfstretch.png',
    descRu: 'Упор руками в стену, одна нога отставлена назад, пятка прижата к полу.',
    descEn: 'Jump for maximum height off one leg. Drive opposite knee up.',
    descCn: '单腿起跳追求最大高度。对侧膝盖上提。',
    dosage: '2 × 5 повт. на ногу',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Мах коленом вверх!', 'Максимальное вертикальное смещение!'],
    coachEn: ['Drive the opposite knee up!', 'Maximize vertical displacement!'],
    coachCn: ['对侧膝盖上提！', '最大化垂直位移！']
  },

  {
    id: 61, cat: 'flexibility', nameRu: 'Растяжка задней поверхности бедра', nameEn: 'Hamstring Stretch', level: 'beginner', equipment: ['bodyweight'], img: 'images/hamstringstretch.png',
    descRu: 'Сидя на полу, наклон вперёд к прямым ногам. Спина ровная.',
    descEn: 'Step off box, land and rebound on one leg. Very high intensity.',
    descCn: '从跳箱步下，单腿着地并反弹。非常高强度。',
    dosage: '3 × 4 повт. на ногу',
    muscles: ['quads', 'calves', 'glutes'],
    coachRu: ['Сохраняй ось колена!', 'Быстрый отскок!'],
    coachEn: ['Maintain knee alignment!', 'Quick rebound!'],
    coachCn: ['保持膝盖轴线！', '快速反弹！']
  },

  {
    id: 62, cat: 'flexibility', nameRu: 'Бабочка', nameEn: 'Butterfly Stretch', level: 'beginner', equipment: ['bodyweight'], img: 'images/butterflystretch.png',
    descRu: 'Сидя, стопы вместе, колени в стороны. Растяжка приводящих мышц.',
    descEn: 'Rise on tiptoes, drop into deep hinge (high hips, flat back), feel hamstrings, then explode up.',
    descCn: '踮脚尖站立，落入深度铰链（髋部高位，背部平直），感受后侧链，然后爆发向上。',
    dosage: '5-8 повт. (разминка)',
    muscles: ['hamstrings', 'glutes'],
    coachRu: ['Щёлкни бёдрами!', 'Почувствуй заднюю!', 'Бум — вверх!'],
    coachEn: ['Snap the hips!', 'Feel the hamstrings!', 'Boom pop up!'],
    coachCn: ['弹髋！', '感受后侧链！', '砰——弹起！']
  },

  {
    id: 63, cat: 'flexibility', nameRu: 'Растяжка квадрицепса стоя', nameEn: 'Quad Stretch', level: 'beginner', equipment: ['bodyweight'], img: 'images/quadstretch.png',
    descRu: 'Стоя на одной ноге, захват стопы другой ноги и подтягивание пятки к ягодице.',
    descEn: 'Hop-step-jump sequence. Develops coordination and horizontal power.',
    descCn: '跳-践-跳序列。发展协调性和水平爆发力。',
    dosage: '4 повт.',
    muscles: ['quads', 'glutes', 'calves'],
    coachRu: ['Ровный ритм между фазами!'],
    coachEn: ['Even rhythm between phases!'],
    coachCn: ['各阶段之间保持均匀节奏！']
  },

  {
    id: 64, cat: 'flexibility', nameRu: 'Растяжка сгибателей бедра', nameEn: 'Hip Flexor Stretch', level: 'beginner', equipment: ['bodyweight'], img: 'images/hipflexorstretch.png',
    descRu: 'Стоя на одном колене, таз подать вперёд. Растяжка передней поверхности бедра и подвздошной мышцы.',
    descEn: 'Bounding with focus on minimizing ground contact time rather than max height.',
    descCn: '连续跳跃，专注于最小化触地时间而非最大高度。',
    dosage: '3-4 × 6 повт.',
    muscles: ['calves', 'quads', 'glutes'],
    coachRu: ['Быстрые ноги!', 'Продвигайся вперёд!'],
    coachEn: ['Fast feet!', 'Keep momentum moving forward!'],
    coachCn: ['快脚！', '保持向前动力！']
  },

  {
    id: 65, cat: 'mobility', nameRu: 'Круговые вращения шеей', nameEn: 'Neck Circles', level: 'beginner', equipment: ['bodyweight'], img: 'images/neckcircles.png',
    descRu: 'Плавные круговые движения головой для разминки шейного отдела.',
    descEn: 'Sit on box, explosively jump vertically. Eliminates eccentric phase — pure concentric power.',
    descCn: '坐在跳箱上，爆发性垂直跳跃。消除离心阶段——纯向心力量。',
    dosage: '3 × 5 повт.',
    muscles: ['quads', 'glutes'],
    coachRu: ['Взрыв вверх немедленно!', 'Без раскачки!'],
    coachEn: ['Explode upward immediately!', 'No rocking!'],
    coachCn: ['立即向上爆发！', '不要摇晃！']
  },

  {
    id: 66, cat: 'mobility', nameRu: 'Круговые вращения руками', nameEn: 'Arm Circles', level: 'beginner', equipment: ['bodyweight'], img: 'images/armcircles.png',
    descRu: 'Вращения прямыми руками вперёд и назад для разогрева плечевых суставов.',
    descEn: 'Step off box and stick the landing WITHOUT rebounding. Focus on force absorption.',
    descCn: '从跳箱步下并稳定着地，不反弹。专注于力量吸收。',
    dosage: '3-5 × 5-8 повт.',
    muscles: ['quads', 'glutes'],
    coachRu: ['Зафиксируй приземление!', 'Без звука!', 'Сильная атлетическая позиция!'],
    coachEn: ['Stick the landing!', 'No noise!', 'Strong athletic position!'],
    coachCn: ['稳住着地！', '无声！', '强有力的运动姿势！']
  }
];

// === TECHNIQUE ERRORS ===
const TECHNIQUE_PHASES = [
  { id: 'approach', nameRu: 'Разбег', nameEn: 'Approach Run', icon: '🏃', color: '#f2994a' },
  { id: 'curve', nameRu: 'Дуга', nameEn: 'Curve', icon: '↪️', color: '#2383e2' },
  { id: 'penultimate', nameRu: 'Предпоследний шаг', nameEn: 'Penultimate Step', icon: '👣', color: '#9b51e0' },
  { id: 'takeoff', nameRu: 'Отталкивание', nameEn: 'Takeoff', icon: '🚀', color: '#eb5757' },
  { id: 'flight', nameRu: 'Полёт / переход', nameEn: 'Flight & Bar Clearance', icon: '🌊', color: '#00a86b' },
  { id: 'landing', nameRu: 'Приземление', nameEn: 'Landing', icon: '🛬', color: '#56ccf2' }
];

const TECHNIQUE_ERRORS = [
  // APPROACH
  {
    id: 1, phase: 'approach',
    errorRu: 'Замедление в конце разбега', errorEn: 'Decelerating at end of approach',
    descRu: 'Спортсмен сбрасывает скорость перед отталкиванием из-за неуверенности или подготовки к прыжку.',
    descEn: 'Athlete slows down before takeoff due to uncertainty or preparing to jump.',
    fixRu: 'Ускоряться непрерывно через последние 3 шага. Фокус на «разбег В планку», а не «разбег К планке».',
    fixEn: 'Accelerate continuously through last 3 steps. Focus on running THROUGH the bar, not TO the bar.',
    cuesRu: ['Ускоряйся НА планку!', 'Не тормози — проходи!'],
    cuesEn: ['Accelerate THROUGH the bar!', 'Don\'t brake — run through!'],
    errorCn: '助跑末端减速',
    descCn: '运动员在起跳前因不确信或准备跳跃而减速。',
    fixCn: '连续加速通过最后3步。专注于跑穿过横杆而非朝向横杆。',
    cuesCn: ['加速穿过横杆！', '不要刹车——冲过去！']
  },
  {
    id: 2, phase: 'approach',
    errorRu: 'Непоследовательная длина шагов', errorEn: 'Inconsistent stride length',
    descRu: 'Шаги разной длины — спортсмен «подстраивается» к отталкиванию вместо ритмичного разбега.',
    descEn: 'Varying step lengths — athlete adjusts to hit the takeoff mark instead of running rhythmically.',
    fixRu: 'Отмерить разбег от толчковой точки. Использовать контрольные метки. Стабильный старт.',
    fixEn: 'Measure approach from takeoff point. Use check marks. Consistent start position.',
    cuesRu: ['Ритм! Ровные шаги!', 'Начинай одинаково!'],
    cuesEn: ['Rhythm! Even steps!', 'Same start every time!'],
    errorCn: '步幅长度不一致',
    descCn: '步幅长度不同，运动员调整步伐以踩到起跳标记而非有节奏地跑。',
    fixCn: '从起跳点测量助跑距离。使用检查标记。稳定的起跑位置。',
    cuesCn: ['节奏！均匀步伐！', '每次相同的起跑！']
  },
  {
    id: 3, phase: 'approach',
    errorRu: 'Наклон корпуса вперёд', errorEn: 'Forward lean / poor posture',
    descRu: 'Бег с наклоном туловища вперёд, голова опущена, центр масс перед ногами.',
    descEn: 'Running with forward trunk lean, head down, center of mass ahead of feet.',
    fixRu: 'Беги высоко. Голова над плечами, плечи над бёдрами. Смотри вперёд.',
    fixEn: 'Run tall. Head over shoulders, shoulders over hips. Eyes forward.',
    cuesRu: ['Беги высоко!', 'Голова вверх!', 'Гордая грудь!'],
    cuesEn: ['Run tall!', 'Head up!', 'Proud chest!'],
    errorCn: '躯干前倾',
    descCn: '躯干前倾跑步，头部低垂，重心在脚前方。',
    fixCn: '高位跑姿。头在肩上方，肩在髋上方。目视前方。',
    cuesCn: ['保持高位跑姿！', '抬头！', '挺胸！']
  },
  {
    id: 4, phase: 'approach',
    errorRu: 'Слишком медленный разбег', errorEn: 'Approach too slow',
    descRu: 'Скорость разбега недостаточна для эффективного перевода горизонтальной энергии в вертикальную.',
    descEn: 'Approach speed insufficient for effective horizontal-to-vertical energy conversion.',
    fixRu: 'Увеличить контролируемую скорость. Тренировать спринт 30-60м. Удлинить разбег при необходимости.',
    fixEn: 'Increase controlled speed. Train 30-60m sprints. Lengthen approach if needed.',
    cuesRu: ['Быстрее! Контролируемая скорость!', 'Набирай!'],
    cuesEn: ['Faster! Controlled speed!', 'Build up!'],
    errorCn: '助跑速度太慢',
    descCn: '助跑速度不足以有效地将水平能量转化为垂直能量。',
    fixCn: '增加可控速度。训练30-60米冲刺。必要时延长助跑。',
    cuesCn: ['更快！可控速度！', '加速！']
  },

  // CURVE
  {
    id: 5, phase: 'curve',
    errorRu: 'Срезание дуги (слишком узкая)', errorEn: 'Cutting the curve too tight',
    descRu: 'Спортсмен бежит по слишком маленькому радиусу, теряя скорость и нарушая механику.',
    descEn: 'Athlete runs too tight a radius, losing speed and disrupting mechanics.',
    fixRu: 'Выпрямить начало дуги. Радиус 8-12м. Постепенное закручивание.',
    fixEn: 'Straighten early curve. 8-12m radius. Gradual tightening.',
    cuesRu: ['Шире дугу!', 'Плавно закручивай!'],
    cuesEn: ['Widen the curve!', 'Gradually tighten!'],
    errorCn: '弧线太紧',
    descCn: '运动员跑的弧线半径太小，失去速度并破坏力学。',
    fixCn: '拉直弧线起始部分。半径8-12米。逐渐收紧。',
    cuesCn: ['弧线放宽！', '逐渐收紧！']
  },
  {
    id: 6, phase: 'curve',
    errorRu: 'Выпрямление дуги', errorEn: 'Flattening the curve',
    descRu: 'Дуга становится прямой линией — спортсмен теряет центробежный наклон и выходит на планку под неправильным углом.',
    descEn: 'Curve becomes a straight line — athlete loses centrifugal lean and arrives at bar at wrong angle.',
    fixRu: 'Бег по конусам. Толкаться от внешней стороны стопы. Сохранять наклон ОТ планки.',
    fixEn: 'Run along cones. Push off outside edge of foot. Maintain lean AWAY from bar.',
    cuesRu: ['Толкайся наружу!', 'Наклон от планки!'],
    cuesEn: ['Push to the outside!', 'Lean away from bar!'],
    errorCn: '弧线变直',
    descCn: '弧线变成直线，运动员失去离心倾斜，以错误角度到达横杆。',
    fixCn: '沿锥标跑。用脚外侧蹬地。保持远离横杆的倾斜。',
    cuesCn: ['向外推蹬！', '远离横杆倾斜！']
  },
  {
    id: 7, phase: 'curve',
    errorRu: 'Выход из дуги перед отталкиванием', errorEn: 'Stepping out of curve before takeoff',
    descRu: 'Последний шаг идёт прямо от планки — теряется вращательный момент.',
    descEn: 'Last step goes straight away from bar — rotational momentum is lost.',
    fixRu: 'Продолжай кривизну до самого отталкивания. Толчковая нога ставится на дугу.',
    fixEn: 'Continue curvature into the takeoff. Plant foot stays on the curve.',
    cuesRu: ['Оставайся на дуге!', 'Не уходи наружу!'],
    cuesEn: ['Stay on the curve!', 'Don\'t step out!'],
    errorCn: '起跳前偏离弧线',
    descCn: '最后一步直接远离横杆，失去旋转动量。',
    fixCn: '保持弧线曲率直到起跳。起跳脚保持在弧线上。',
    cuesCn: ['保持在弧线上！', '不要偏离！']
  },
  {
    id: 8, phase: 'curve',
    errorRu: 'Внутреннее плечо «падает» вниз', errorEn: 'Inside shoulder drops',
    descRu: 'Внутреннее (ближнее к планке) плечо опускается — нарушается осевая линия тела.',
    descEn: 'Inside shoulder (nearest bar) drops down — body axis is disrupted.',
    fixRu: 'Плечи на одном уровне. Руки работают симметрично.',
    fixEn: 'Keep shoulders level. Arms work symmetrically.',
    cuesRu: ['Плечи ровно!', 'Не заваливайся!'],
    cuesEn: ['Shoulders level!', 'Don\'t lean in!'],
    errorCn: '内侧肩下沉',
    descCn: '内侧肩膀下沉，身体轴线被破坏。',
    fixCn: '保持肩膀水平。手臂对称运动。',
    cuesCn: ['肩膀保持水平！', '不要下沉！']
  },
  {
    id: 9, phase: 'curve',
    errorRu: 'Голова повёрнута к планке', errorEn: 'Head turned toward bar',
    descRu: 'Спортсмен смотрит НА планку вместо направления бега.',
    descEn: 'Athlete looks AT the bar instead of in the direction of running.',
    fixRu: 'Глаза по направлению бега. Периферийное восприятие планки.',
    fixEn: 'Eyes in direction of run. Peripheral awareness of bar.',
    cuesRu: ['Смотри куда бежишь!', 'Планка — периферия!'],
    cuesEn: ['Look where you\'re running!', 'Bar is peripheral!'],
    errorCn: '头转向横杆',
    descCn: '运动员看向横杆而非跑步方向。',
    fixCn: '目视跑步方向。用余光感知横杆。',
    cuesCn: ['看你跑的方向！', '横杆用余光感知！']
  },

  // PENULTIMATE
  {
    id: 10, phase: 'penultimate',
    errorRu: 'Нет понижения центра масс', errorEn: 'Failure to lower center of mass',
    descRu: 'Предпоследний шаг не длиннее обычного — нет «загрузки» для отталкивания.',
    descEn: 'Penultimate step not longer than normal — no "loading" for takeoff.',
    fixRu: 'Удлинить предпоследний шаг. Опустить бёдра на 10-15 см. «Длинный-короткий» ритм.',
    fixEn: 'Lengthen penultimate step. Drop hips 10-15cm. "Long-short" rhythm.',
    cuesRu: ['Длинный — короткий!', 'Опусти бёдра!', 'Загрузись!'],
    cuesEn: ['Long — short!', 'Drop the hips!', 'Load up!'],
    errorCn: '未降低重心',
    descCn: '倒数第二步没有比正常步长，起跳没有蓄力。',
    fixCn: '延长倒数第二步。降低髋部10-15厘米。“长-短”节奏。',
    cuesCn: ['长——短！', '降低髋部！', '蓄力！']
  },
  {
    id: 11, phase: 'penultimate',
    errorRu: '«Проваливание» на предпоследнем шаге', errorEn: 'Buckling on penultimate step',
    descRu: 'Колено сгибается слишком сильно — спортсмен «тонет» и теряет энергию.',
    descEn: 'Knee bends too much — athlete "sinks" and loses energy.',
    fixRu: 'Жёсткая активная опорная нога. Быстрый переход к толчковому шагу.',
    fixEn: 'Firm active support leg. Quick transition to takeoff step.',
    cuesRu: ['Не проваливайся!', 'Жёсткие ноги!', 'Быстрый переход!'],
    cuesEn: ['Don\'t sink!', 'Stiff legs!', 'Quick transition!'],
    errorCn: '倒数第二步下沉',
    descCn: '膝盖弯曲过多，运动员下沉并失去能量。',
    fixCn: '坚实的主动支撑腿。快速过渡到起跳步。',
    cuesCn: ['不要下沉！', '腿保持刚性！', '快速过渡！']
  },

  // TAKEOFF
  {
    id: 12, phase: 'takeoff',
    errorRu: 'Постановка стопы слишком далеко', errorEn: 'Plant foot too far ahead',
    descRu: 'Толчковая нога ставится далеко впереди ЦМ — «торможение». Потеря горизонтальной скорости.',
    descEn: 'Takeoff foot placed too far ahead of COM — "braking". Loss of horizontal velocity.',
    fixRu: 'Ставить стопу ближе под центр масс. Быстрый «шлёп» контакт.',
    fixEn: 'Place foot closer under COM. Quick "slap" contact.',
    cuesRu: ['Стопа под себя!', 'Быстрый контакт!'],
    cuesEn: ['Foot under you!', 'Quick contact!'],
    errorCn: '起跳脚过远',
    descCn: '起跳脚置于重心前方太远，制动效果。水平速度损失。',
    fixCn: '将脚放在更靠近重心下方。快速拍打接触。',
    cuesCn: ['脚放在身体下方！', '快速接触！']
  },
  {
    id: 13, phase: 'takeoff',
    errorRu: 'Постановка стопы слишком близко', errorEn: 'Plant foot too close / under body',
    descRu: 'Толчковая нога ставится слишком близко — нет времени для создания вертикальной силы.',
    descEn: 'Plant foot too close — insufficient time to generate vertical force.',
    fixRu: 'Небольшой вынос стопы вперёд (45° голень к земле). «Плоский» контакт.',
    fixEn: 'Slight foot reach ahead (45° shin to ground). "Flat" contact.',
    cuesRu: ['Поставь перед собой!', 'Плоский контакт!'],
    cuesEn: ['Reach out slightly!', 'Flat foot contact!'],
    errorCn: '起跳脚太近',
    descCn: '起跳脚太近，没有足够时间产生垂直力。',
    fixCn: '脚稍微前伸（小腿与地面成45°角）。平脚接触。',
    cuesCn: ['稍微前伸！', '平脚接触！']
  },
  {
    id: 14, phase: 'takeoff',
    errorRu: '«Сгибание» толчковой ноги (buckle)', errorEn: 'Takeoff leg buckling / collapsing',
    descRu: 'Колено толчковой ноги чрезмерно сгибается — потеря жёсткости, прыжок «в пол».',
    descEn: 'Takeoff knee bends excessively — loss of stiffness, jump goes "into the floor".',
    fixRu: 'Жёсткая толчковая нога. Тройное разгибание (лодыжка-колено-бедро). Изометрические приседания.',
    fixEn: 'Stiff takeoff leg. Triple extension (ankle-knee-hip). Isometric squats for strength.',
    cuesRu: ['Жёсткая нога!', 'Стиффлег!', 'Через ногу!'],
    cuesEn: ['Stiff leg!', 'Drive through!', 'Triple extension!'],
    errorCn: '起跳腿弯曲塑陷',
    descCn: '起跳膝盖过度弯曲，失去刚性，跳跃落入地板。',
    fixCn: '刚性起跳腿。三重伸展（踝-膝-髋）。等长深蹲增强力量。',
    cuesCn: ['腿保持刚性！', '蹬伸到底！', '三重伸展！']
  },
  {
    id: 15, phase: 'takeoff',
    errorRu: 'Пассивный мах свободной ногой', errorEn: 'Passive free leg / no knee drive',
    descRu: 'Маховая нога не участвует в создании вертикальной силы — прыжок слабый.',
    descEn: 'Free leg doesn\'t contribute to vertical force generation — weak jump.',
    fixRu: 'Агрессивный мах коленом вверх до параллели с землёй. Стопа на себя (dorsiflexion).',
    fixEn: 'Aggressive knee drive upward to parallel. Toe dorsiflexed.',
    cuesRu: ['Колено ВВЕРХ!', 'Пробивай коленом!', 'Стопа на себя!'],
    cuesEn: ['Knee UP!', 'Punch the knee!', 'Toe up!'],
    errorCn: '摆动腿被动',
    descCn: '摆动腿不参与产生垂直力，跳跃力量弱。',
    fixCn: '积极向上提膝至平行位置。脚尖背屈。',
    cuesCn: ['膝盖向上！', '猛提膝盖！', '脚尖上勾！']
  },
  {
    id: 16, phase: 'takeoff',
    errorRu: 'Пассивные руки при отталкивании', errorEn: 'Passive arms at takeoff',
    descRu: 'Руки не участвуют в отталкивании — потеря 10-15% высоты прыжка.',
    descEn: 'Arms don\'t contribute to takeoff — 10-15% height loss.',
    fixRu: 'Двойной или одинарный мах руками вверх синхронно с маховым коленом.',
    fixEn: 'Double or single arm drive upward synchronized with knee drive.',
    cuesRu: ['Руки ВВЕРХ!', 'Мах руками = мах коленом!'],
    cuesEn: ['Arms UP!', 'Arm drive = knee drive!'],
    errorCn: '起跳时手臂被动',
    descCn: '手臂不参与起跳，损奉10-15%的跳跃高度。',
    fixCn: '双臂或单臂向上摆动，与提膝同步。',
    cuesCn: ['手臂向上！', '摆臂=提膝！']
  },

  // FLIGHT
  {
    id: 17, phase: 'flight',
    errorRu: '«Сидение» над планкой', errorEn: 'Sitting over the bar',
    descRu: 'Спортсмен не прогибается — бёдра остаются согнутыми, ноги свисают.',
    descEn: 'Athlete doesn\'t arch — hips stay flexed, legs hang down.',
    fixRu: 'Активный прогиб: голова назад, бёдра к потолку. Back-over тренировки.',
    fixEn: 'Active arch: head back, hips to ceiling. Back-over drills.',
    cuesRu: ['Бёдра ВВЕРХ!', 'Прогнись!', 'Покажи живот!'],
    cuesEn: ['Hips UP!', 'Arch!', 'Show your belly!'],
    errorCn: '坐在横杆上方',
    descCn: '运动员不弓身，髋部保持屈曲，腿下垂。',
    fixCn: '主动弓身：头向后，髋部向天花板。背越式训练。',
    cuesCn: ['髋部向上！', '弓身！', '露出肚子！']
  },
  {
    id: 18, phase: 'flight',
    errorRu: 'Движение вдоль планки', errorEn: 'Traveling along the bar',
    descRu: 'Спортсмен летит вдоль планки вместо перпендикулярного перехода — сбивает планку плечом/телом.',
    descEn: 'Athlete travels along the bar instead of perpendicular clearance — hits bar with shoulder/body.',
    fixRu: 'Корректировать угол разбега и точку отталкивания. Прыгать ВВЕРХ, а не вдоль.',
    fixEn: 'Correct approach angle and takeoff point. Jump UP, not along.',
    cuesRu: ['Вверх, не вдоль!', 'Перпендикулярно!'],
    cuesEn: ['Up, not along!', 'Perpendicular!'],
    errorCn: '沿横杆方向移动',
    descCn: '运动员沿横杆飞行而非垂直越过，用肩膀碰杆。',
    fixCn: '调整助跑角度和起跳点。向上跳，而非沿着。',
    cuesCn: ['向上，不是沿着！', '垂直穿越！']
  },
  {
    id: 19, phase: 'flight',
    errorRu: 'Преждевременный прогиб', errorEn: 'Premature arching',
    descRu: 'Прогиб начинается ДО достижения пика прыжка — теряется высота.',
    descEn: 'Arch begins BEFORE reaching peak of jump — height is lost.',
    fixRu: 'Подождать пик. Сначала набрать высоту, потом прогнуться.',
    fixEn: 'Wait for peak. First gain height, then arch.',
    cuesRu: ['Не торопись!', 'Сначала вверх, потом прогиб!'],
    cuesEn: ['Don\'t rush!', 'Up first, then arch!'],
    errorCn: '过早弓身',
    descCn: '弓身在到达跳跃顶点之前开始，失去高度。',
    fixCn: '等待顶点。先获得高度，然后弓身。',
    cuesCn: ['不要急！', '先向上，再弓身！']
  },
  {
    id: 20, phase: 'flight',
    errorRu: 'Планку сбивают пятки/голени', errorEn: 'Heels/shins hitting bar',
    descRu: 'После прохода бёдер ноги не поднимаются — голени сбивают планку.',
    descEn: 'After hips clear, legs don\'t lift — shins knock the bar.',
    fixRu: 'Подбородок к груди + резкий «кик» голеней вверх в момент прогиба.',
    fixEn: 'Chin to chest + sharp shin kick-up at arch moment.',
    cuesRu: ['Подбородок к груди!', 'Выстрели ногами!'],
    cuesEn: ['Chin to chest!', 'Snap the legs up!'],
    errorCn: '脚跟小腿碰杆',
    descCn: '髋部过杆后腿没有抬起，小腿碰掉横杆。',
    fixCn: '下巴收向胸部+弓身时猛踢小腿向上。',
    cuesCn: ['下巴收胸！', '猛踢腿！']
  },
  {
    id: 21, phase: 'flight',
    errorRu: 'Руки задевают планку', errorEn: 'Arms hitting the bar',
    descRu: 'Руки находятся сбоку или внизу и цепляют планку.',
    descEn: 'Arms positioned to the side or down, catching the bar.',
    fixRu: 'Руки к груди или вдоль тела при переходе. Компактная поза.',
    fixEn: 'Arms to chest or along body during clearance. Compact position.',
    cuesRu: ['Руки к груди!', 'Компактно!'],
    cuesEn: ['Arms in!', 'Stay compact!'],
    errorCn: '手臂碰杆',
    descCn: '手臂在侧面或下方，碰到横杆。',
    fixCn: '过杆时手臂贴胸或贴身。紧凑姿势。',
    cuesCn: ['手臂收紧！', '保持紧凑！']
  },

  // LANDING
  {
    id: 22, phase: 'landing',
    errorRu: 'Приземление на голову/шею', errorEn: 'Landing on head/neck',
    descRu: 'Опасное приземление — голова запрокинута, контакт с матом шеей или затылком.',
    descEn: 'Dangerous landing — head thrown back, contact with mat on neck or back of head.',
    fixRu: 'Подбородок ВСЕГДА прижат к груди при приземлении. Приземляться на верхнюю часть спины.',
    fixEn: 'Chin ALWAYS tucked to chest on landing. Land on upper back.',
    cuesRu: ['Подбородок к груди!', 'На спину, не на шею!', 'БЕЗОПАСНОСТЬ!'],
    cuesEn: ['Chin to chest!', 'Upper back, not neck!', 'SAFETY!'],
    errorCn: '头颈着地',
    descCn: '危险着地，头向后仰，颈部或后脑勺接触垫子。',
    fixCn: '着地时下巴始终收向胸部。以上背部着地。',
    cuesCn: ['下巴收胸！', '上背着地，不是颈部！', '安全第一！']
  },
  {
    id: 23, phase: 'landing',
    errorRu: 'Колени вместе при приземлении', errorEn: 'Knees together on landing',
    descRu: 'Колени смыкаются из-за вращения — риск удара коленями в лицо.',
    descEn: 'Knees come together from rotation — risk of knees hitting face.',
    fixRu: 'Развести колени при приземлении. Руки перед лицом для защиты.',
    fixEn: 'Spread knees on landing. Hands in front of face for protection.',
    cuesRu: ['Колени врозь!', 'Руки перед лицом!'],
    cuesEn: ['Knees apart!', 'Hands in front of face!'],
    errorCn: '着地时膝盖并拢',
    descCn: '膝盖因旋转而并拢，有膝盖撞脸的风险。',
    fixCn: '着地时分开膝盖。双手在脸前保护。',
    cuesCn: ['膝盖分开！', '双手护脸！']
  }
];

// === TECHNIQUE CHECKLISTS ===
const TECHNIQUE_CHECKLIST = [
  {
    phase: 'approach', items: [
      { id: 'c1', textRu: 'Ускорение непрерывное (не замедляется)', textEn: 'Continuous acceleration (no deceleration)' },
      { id: 'c2', textRu: 'Шаги ровные (нет подстройки)', textEn: 'Even strides (no adjusting)' },
      { id: 'c3', textRu: 'Вертикальная осанка (бежит высоко)', textEn: 'Upright posture (runs tall)' }
    ]
  },
  {
    phase: 'curve', items: [
      { id: 'c4', textRu: 'Плавный переход в дугу', textEn: 'Smooth transition into curve' },
      { id: 'c5', textRu: 'Наклон от центра (не плечом, а всем телом)', textEn: 'Lean from center (whole body, not just shoulder)' },
      { id: 'c6', textRu: 'Скорость не падает на дуге', textEn: 'Speed maintained through curve' },
      { id: 'c7', textRu: 'Голова по направлению бега', textEn: 'Head in direction of run' }
    ]
  },
  {
    phase: 'penultimate', items: [
      { id: 'c8', textRu: 'Предпоследний шаг длиннее обычного', textEn: 'Penultimate step longer than average' },
      { id: 'c9', textRu: 'Понижение ЦМ ощутимое', textEn: 'Visible COM lowering' },
      { id: 'c10', textRu: 'Ритм «длинный-короткий» чёткий', textEn: '"Long-short" rhythm clear' }
    ]
  },
  {
    phase: 'takeoff', items: [
      { id: 'c11', textRu: 'Постановка стопы быстрая и плоская', textEn: 'Quick, flat foot plant' },
      { id: 'c12', textRu: 'Толчковая нога жёсткая (нет проваливания)', textEn: 'Takeoff leg stiff (no buckling)' },
      { id: 'c13', textRu: 'Активный мах коленом', textEn: 'Active knee drive' },
      { id: 'c14', textRu: 'Руки участвуют в отталкивании', textEn: 'Arms contribute to takeoff' },
      { id: 'c15', textRu: 'Отталкивание вертикальное (вверх, не вдоль)', textEn: 'Vertical takeoff (up, not along)' }
    ]
  },
  {
    phase: 'flight', items: [
      { id: 'c16', textRu: 'Прогиб начинается в пике', textEn: 'Arch begins at peak' },
      { id: 'c17', textRu: 'Бёдра поднимаются к потолку', textEn: 'Hips drive toward ceiling' },
      { id: 'c18', textRu: 'Сброс ног по времени (подбородок → кик)', textEn: 'Leg clearance timed (chin → kick)' },
      { id: 'c19', textRu: 'Руки компактно', textEn: 'Arms compact' }
    ]
  },
  {
    phase: 'landing', items: [
      { id: 'c20', textRu: 'Подбородок прижат к груди', textEn: 'Chin tucked to chest' },
      { id: 'c21', textRu: 'Приземление на верхнюю часть спины', textEn: 'Landing on upper back' }
    ]
  }
];

// === WARMUP PROTOCOLS ===
const WARMUP_PROTOCOLS = {
  training: {
    nameRu: '🏋️ Тренировочная', nameEn: 'Training',
    phases: [
      {
        nameRu: '1. Общая разминка', nameEn: '1. General Warm-Up', time: '8-10 мин',
        items: [
          { nameRu: 'Бег 400-800м', nameEn: 'Jog 400-800m', dosage: '5-8 мин' },
          { nameRu: 'А-подскок', nameEn: 'A-Skips', dosage: '2 × 30м' },
          { nameRu: 'Подскок с махом', nameEn: 'Power Skips', dosage: '2 × 30м' },
          { nameRu: 'Подскок назад', nameEn: 'Backward Skips', dosage: '2 × 20м' }
        ]
      },
      {
        nameRu: '2. Динамическая мобильность', nameEn: '2. Dynamic Mobility', time: '8-10 мин',
        items: [
          { nameRu: 'Выпады в ходьбе', nameEn: 'Walking Lunges', dosage: '2 × 10' },
          { nameRu: 'Махи ногой (вперёд-назад, в стороны)', nameEn: 'Leg Swings (F-B, L-R)', dosage: '10 каждое' },
          { nameRu: 'Пого-прыжки', nameEn: 'Pogo Jumps (ankle stiffness)', dosage: '2 × 15' },
          { nameRu: 'Бросок медбола снизу', nameEn: 'Medicine Ball Scoop Toss', dosage: '5-8 повт.' }
        ]
      },
      {
        nameRu: '3. Специальные упражнения', nameEn: '3. Specific Drills', time: '10-15 мин',
        items: [
          { nameRu: 'Бег по кругу', nameEn: 'Circle Runs', dosage: '3-5 кругов' },
          { nameRu: 'Ножницы (3 шага)', nameEn: 'Scissor Jumps (3 step)', dosage: '4-6 повт.' },
          { nameRu: 'Поп-ап (мах коленом)', nameEn: 'Pop-Up (knee drive)', dosage: '5-8 повт.' },
          { nameRu: 'Прокатка (run-through)', nameEn: 'Run-Throughs (no jump)', dosage: '3-5 повт.' }
        ]
      }
    ]
  },
  competition: {
    nameRu: '🏟️ Соревновательная', nameEn: 'Competition',
    phases: [
      {
        nameRu: '1. Общая разминка', nameEn: '1. General Warm-Up', time: '10 мин',
        items: [
          { nameRu: 'Бег 800м (за 30-45 мин до старта)', nameEn: 'Jog 800m (30-45 min before)', dosage: '8 мин' },
          { nameRu: 'А-подскоки + Б-подскоки', nameEn: 'A-Skips + B-Skips', dosage: '2 × 30м каждый' }
        ]
      },
      {
        nameRu: '2. Активация', nameEn: '2. Activation', time: '8 мин',
        items: [
          { nameRu: 'Выпады + махи', nameEn: 'Lunges + Swings', dosage: '1 × 10 каждый' },
          { nameRu: 'Пого-прыжки', nameEn: 'Pogo Jumps', dosage: '2 × 10' },
          { nameRu: 'Прыжки вверх на месте', nameEn: 'Standing Vertical Jumps', dosage: '3-5 повт.' }
        ]
      },
      {
        nameRu: '3. Специфика', nameEn: '3. Specific', time: '10 мин',
        items: [
          { nameRu: 'Прокатка полного разбега', nameEn: 'Full Approach Run-Through', dosage: '3-4 повт.' },
          { nameRu: 'Прыжки с 3 шагов (низкая планка)', nameEn: '3-Step Jumps (low bar)', dosage: '2-3 повт.' },
          { nameRu: 'Дыхание (Box Breathing)', nameEn: 'Box Breathing', dosage: '2 мин' }
        ]
      }
    ]
  },
  light: {
    nameRu: '🧘 Восстановительная', nameEn: 'Recovery / Light',
    phases: [
      {
        nameRu: '1. Лёгкая активация', nameEn: '1. Light Activation', time: '10 мин',
        items: [
          { nameRu: 'Лёгкий бег', nameEn: 'Light Jog', dosage: '5 мин' },
          { nameRu: 'Динамическая растяжка', nameEn: 'Dynamic Stretching', dosage: '5 мин' }
        ]
      },
      {
        nameRu: '2. Мобильность', nameEn: '2. Mobility', time: '10 мин',
        items: [
          { nameRu: 'Человек-паук (Spiderman)', nameEn: 'Spiderman Lunge', dosage: '5 на сторону' },
          { nameRu: '90/90 ротации', nameEn: '90/90 Rotations', dosage: '10 на сторону' },
          { nameRu: 'Проходка через барьеры', nameEn: 'Hurdle Walkovers', dosage: '6 барьеров' },
          { nameRu: 'Прокатка роллом', nameEn: 'Foam Rolling', dosage: '30 сек/зона' }
        ]
      }
    ]
  }
};

// === PERIODIZATION ===
const PERIODIZATION = [
  {
    id: 'gpp', nameRu: 'ОФП (общая)', nameEn: 'GPP', color: '#00a86b', icon: '🛡️',
    duration: '4-6 нед.', volumeRu: 'Высокий', volumeEn: 'High', intensityRu: 'Низкая-умеренная', intensityEn: 'Low-Moderate',
    goalRu: 'Фундамент: общая физическая подготовка, базовая сила, выносливость, координация.',
    goalEn: 'Foundation: general fitness, base strength, endurance, coordination.',
    exercisesRu: ['Круговые тренировки', 'Гипертрофия (3-4 × 8-12)', 'Кор-стабильность', 'Темповый бег', 'Плиометрика низкой интенсивности'],
    exercisesEn: ['Circuit training', 'Hypertrophy (3-4 × 8-12)', 'Core stability', 'Tempo runs', 'Low-impact plyometrics'],
    contacts: '50-80 / сессия'
  },
  {
    id: 'spp', nameRu: 'СФП (специальная)', nameEn: 'SPP', color: '#f2994a', icon: '⚡',
    duration: '6-8 нед.', volumeRu: 'Умеренный', volumeEn: 'Moderate', intensityRu: 'Нарастающая', intensityEn: 'Increasing',
    goalRu: 'Специфическая мощность: силовые с акцентом на скорость, техника прыжка, комплексные тренировки.',
    goalEn: 'Sport-specific power: strength-speed emphasis, jump technique, complex training.',
    exercisesRu: ['Олимпийские подъёмы', 'Тяжёлые приседания (3-5 × 3-5)', 'Комплексные тренировки (присед + прыжок)', 'Ускорения', 'Прыжки с 3-5 шагов'],
    exercisesEn: ['Olympic lifts', 'Heavy squats (3-5 × 3-5)', 'Complex training (squat + jump)', 'Accelerations', '3-5 step jumps'],
    contacts: '80-120 / сессия'
  },
  {
    id: 'comp', nameRu: 'Соревновательный', nameEn: 'Competition', color: '#eb5757', icon: '🏆',
    duration: '6-12 нед.', volumeRu: 'Низкий', volumeEn: 'Low', intensityRu: 'Максимальная', intensityEn: 'Maximal',
    goalRu: 'Пикирование: максимальная скорость, техническое совершенство, соревновательная готовность.',
    goalEn: 'Peaking: maximal speed, technical perfection, competition readiness.',
    exercisesRu: ['Поддерживающая сила (2 × 3-5)', 'Взрывные движения', 'Летящие спринты', 'Прыжки с полного разбега', 'Тактические репетиции'],
    exercisesEn: ['Maintenance strength (2 × 3-5)', 'Explosive movements', 'Flying sprints', 'Full approach jumps', 'Tactical rehearsals'],
    contacts: '40-60 / сессия'
  },
  {
    id: 'trans', nameRu: 'Переходный', nameEn: 'Transition', color: '#56ccf2', icon: '🌊',
    duration: '2-4 нед.', volumeRu: 'Минимальный', volumeEn: 'Minimal', intensityRu: 'Низкая', intensityEn: 'Low',
    goalRu: 'Восстановление: физическое и психологическое восстановление, реабилитация, активный отдых.',
    goalEn: 'Recovery: physical and psychological restoration, rehabilitation, active rest.',
    exercisesRu: ['Плавание, игры', 'Лёгкие круговые', 'Мобильность', 'Прокатка роллом'],
    exercisesEn: ['Swimming, games', 'Light circuits', 'Mobility work', 'Foam rolling'],
    contacts: '0-20 / сессия'
  }
];

// === INJURY PREVENTION ===
const INJURY_DATA = [
  {
    id: 'knee', nameRu: 'Колено прыгуна', nameEn: 'Jumper\'s Knee (Patellar Tendinopathy)', icon: '🦵', color: '#eb5757',
    causeRu: 'Перегрузка сухожилия надколенника при повторяющихся прыжках. Эксцентрические нагрузки при приземлении.',
    causeEn: 'Overload of patellar tendon from repetitive jumping. Eccentric loads during landing.',
    preventionRu: ['Изометрические удержания (разгибание 60°, 30-45 сек)', 'Медленные приседания (3 сек эксцентрика)', 'Приседания на наклонной доске (decline squats)', 'Разогрев перед плиометрикой', 'Правило 10% увеличения нагрузки'],
    preventionEn: ['Isometric holds (extension 60°, 30-45s)', 'Slow-tempo squats (3s eccentric)', 'Decline board squats', 'Warm up before plyometrics', '10% load increase rule'],
    rehabRu: 'Изометрия → изотоника → плиометрика → спорт (постепенно, 8-12 нед.)',
    rehabEn: 'Isometrics → isotonics → plyometrics → sport (progressive, 8-12 weeks)',
    exerciseIds: [41, 43, 25, 29]
  },
  {
    id: 'achilles', nameRu: 'Ахилл', nameEn: 'Achilles Tendon Injuries', icon: '🦶', color: '#f2994a',
    causeRu: 'Высокие нагрузки на ахиллово сухожилие при плиометрике и спринте. Быстрое увеличение объёма.',
    causeEn: 'High loads on Achilles tendon during plyometrics and sprints. Rapid volume increase.',
    preventionRu: ['Эксцентрические подъёмы на носки (heel drops)', 'Подъёмы на икры (прямые + согнутые колени)', 'Постепенное увеличение нагрузки', 'Правильная обувь (шиповки с поддержкой)'],
    preventionEn: ['Eccentric heel drops', 'Calf raises (straight + bent knee)', 'Progressive load increase', 'Proper footwear (spikes with support)'],
    rehabRu: 'Эксцентрические нагрузки → силовые → прыжки (3-12 мес.)',
    rehabEn: 'Eccentric loading → strength → jumping (3-12 months)',
    exerciseIds: [42, 1]
  },
  {
    id: 'back', nameRu: 'Поясница', nameEn: 'Back Injuries (Lumbar Spine)', icon: '🔙', color: '#9b51e0',
    causeRu: 'Повторяющийся прогиб при переходе через планку. Слабые мышцы кора. Скручивание позвоночника при асимметричном приземлении.',
    causeEn: 'Repetitive arching during bar clearance. Weak core muscles. Spinal twisting from asymmetric landings.',
    preventionRu: ['Стабилизация кора (планка, Pallof press)', 'Укрепление ягодиц (мосты, тяги)', 'Мобильность грудного отдела', 'Контроль техники прогиба'],
    preventionEn: ['Core stabilization (plank, Pallof press)', 'Glute strengthening (bridges, deadlifts)', 'Thoracic mobility', 'Arch technique control'],
    rehabRu: 'Стабилизация → укрепление → постепенный возврат к прогибам',
    rehabEn: 'Stabilization → strengthening → gradual return to arching',
    exerciseIds: [38, 40, 46, 34, 27]
  },
  {
    id: 'shin', nameRu: 'Голень (шинсплинт)', nameEn: 'Shin Splints', icon: '🦴', color: '#56ccf2',
    causeRu: 'Бег по твёрдой поверхности. Быстрое увеличение объёма бега/прыжков. Неправильная обувь.',
    causeEn: 'Running on hard surfaces. Rapid increase in running/jumping volume. Improper footwear.',
    preventionRu: ['Подъёмы на икры (стоя + сидя)', 'Ходьба на пятках (tibialis anterior)', 'Постепенное увеличение объёма', 'Разнообразие покрытий (трава, тартан)'],
    preventionEn: ['Calf raises (standing + seated)', 'Heel walks (tibialis anterior)', 'Gradual volume increase', 'Surface variety (grass, tartan)'],
    rehabRu: 'Снижение нагрузки → перекрёстные тренировки → постепенный возврат',
    rehabEn: 'Load reduction → cross-training → gradual return',
    exerciseIds: [42, 1]
  },
  {
    id: 'hamstring', nameRu: 'Задняя поверхность бедра', nameEn: 'Hamstring Strains', icon: '🏃', color: '#00a86b',
    causeRu: 'Высокоскоростной бег (поздняя фаза маха). Недостаточная эксцентрическая сила. Плохая разминка.',
    causeEn: 'High-speed running (late swing phase). Insufficient eccentric strength. Poor warm-up.',
    preventionRu: ['Нордические сгибания (Nordic curls)', 'Румынская тяга', 'Ягодичные мосты', 'Полноценная разминка с динамической растяжкой'],
    preventionEn: ['Nordic hamstring curls', 'Romanian deadlifts', 'Glute bridges', 'Full warm-up with dynamic stretching'],
    rehabRu: 'Изометрия → концентрика → эксцентрика → спринт → спорт',
    rehabEn: 'Isometrics → concentric → eccentric → sprinting → sport',
    exerciseIds: [37, 27, 34, 55]
  }
];

// === MENTAL PREPARATION ===
const MENTAL_PREP = [
  {
    id: 'visualization', nameRu: 'Визуализация', nameEn: 'Visualization / Mental Imagery', icon: '🧠',
    descRu: 'Мысленная репетиция прыжка перед выполнением. Задействовать все чувства: видеть разбег, слышать шаги, ощущать отталкивание.',
    descEn: 'Mental rehearsal of the jump before execution. Engage all senses: see the approach, hear footsteps, feel the takeoff.',
    stepsRu: ['Закройте глаза на 5-10 секунд', 'Представьте идеальный разбег — каждый шаг', 'Почувствуйте отталкивание и мах', 'Увидьте себя над планкой', 'Откройте глаза → начните разбег'],
    stepsEn: ['Close eyes for 5-10 seconds', 'Visualize perfect approach — every step', 'Feel the takeoff and knee drive', 'See yourself clearing the bar', 'Open eyes → begin approach']
  },
  {
    id: 'breathing', nameRu: 'Дыхание (Box Breathing)', nameEn: 'Box Breathing (4-4-4-4)', icon: '💨',
    descRu: 'Квадратное дыхание для снижения стресса и активации парасимпатической нервной системы перед прыжком.',
    descEn: 'Square breathing to reduce stress and activate parasympathetic nervous system before jumping.',
    stepsRu: ['Вдох — 4 секунды', 'Задержка — 4 секунды', 'Выдох — 4 секунды', 'Задержка — 4 секунды', 'Повторить 3-5 циклов'],
    stepsEn: ['Inhale — 4 seconds', 'Hold — 4 seconds', 'Exhale — 4 seconds', 'Hold — 4 seconds', 'Repeat 3-5 cycles']
  },
  {
    id: 'catchCheckChange', nameRu: 'Поймай-Проверь-Замени', nameEn: 'Catch-Check-Change', icon: '🔄',
    descRu: 'Стратегия борьбы с негативными мыслями. Поймай мысль → Проверь её реальность → Замени на конструктивную.',
    descEn: 'Strategy to combat negative thoughts. Catch the thought → Check its validity → Change to constructive.',
    stepsRu: ['ПОЙМАЙ: «Я собью планку...»', 'ПРОВЕРЬ: «Это факт или страх?»', 'ЗАМЕНИ: «Я готов, я тренировался для этого»'],
    stepsEn: ['CATCH: "I\'m going to hit the bar..."', 'CHECK: "Is this fact or fear?"', 'CHANGE: "I\'m ready, I trained for this"']
  },
  {
    id: 'routine', nameRu: 'Пред-прыжковая рутина', nameEn: 'Pre-Performance Routine (PPR)', icon: '🎯',
    descRu: 'Фиксированная последовательность действий перед каждым прыжком. Создаёт ментальный якорь и автоматизм.',
    descEn: 'Fixed sequence of actions before every jump. Creates a mental anchor and automaticity.',
    stepsRu: ['Шаг на разбег → глубокий вдох', 'Визуализация (5 сек)', 'Ключевое слово: «ВВЕРХ!»', 'Начало разбега'],
    stepsEn: ['Step to mark → deep breath', 'Visualization (5 sec)', 'Cue word: "UP!"', 'Begin approach']
  },
  {
    id: 'fear', nameRu: 'Преодоление страха', nameEn: 'Overcoming Fear of the Bar', icon: '😤',
    descRu: 'Постепенное увеличение высоты. Доверие технике. Фокус на процесс, а не результат.',
    descEn: 'Gradual height increase. Trust technique. Focus on process, not outcome.',
    stepsRu: ['Начни с комфортной высоты (на 10-15 см ниже максимума)', 'Выполни 3 успешных прыжка подряд', 'Поднимай планку на 3-5 см', 'Фокус: «Выполни разбег правильно» (не «перепрыгни»)', 'При неудаче → вернись на предыдущую высоту, укрепи уверенность'],
    stepsEn: ['Start at comfortable height (10-15cm below max)', 'Execute 3 successful jumps in a row', 'Raise bar by 3-5cm', 'Focus: "Execute approach correctly" (not "clear it")', 'On failure → return to previous height, build confidence']
  },
  {
    id: 'goals', nameRu: 'Целеполагание', nameEn: 'Goal Setting', icon: '📈',
    descRu: 'Процесс-ориентированные цели вместо результат-ориентированных. «Ускорить разбег» вместо «прыгнуть 2.10».',
    descEn: 'Process-oriented goals instead of outcome-oriented. "Accelerate approach" instead of "jump 2.10m".',
    stepsRu: ['Определите 1-2 процессные цели на тренировку', 'Пример: «Сегодня фокус — мах коленом»', 'Оценивайте успех по выполнению процесса, а не по высоте', 'Вести дневник с рефлексией после тренировки'],
    stepsEn: ['Set 1-2 process goals per session', 'Example: "Today\'s focus — knee drive"', 'Evaluate success by process execution, not height', 'Keep a journal with post-session reflection']
  }
];

// === BIOMECHANICAL BENCHMARKS ===
const BENCHMARKS = {
  approach: {
    titleRu: 'Скорость разбега', titleEn: 'Approach Speed',
    rows: [
      { labelRu: 'Элитные мужчины', labelEn: 'Elite Men', value: '7.0–8.0 м/с' },
      { labelRu: 'Элитные женщины', labelEn: 'Elite Women', value: '6.8–7.4 м/с' },
      { labelRu: 'Speed Floppers', labelEn: 'Speed Floppers', value: '7.8–8.4 м/с' },
      { labelRu: 'Power Floppers', labelEn: 'Power Floppers', value: '6.5–7.5 м/с' }
    ]
  },
  takeoff: {
    titleRu: 'Механика отталкивания', titleEn: 'Takeoff Mechanics',
    rows: [
      { labelRu: 'Время контакта (Speed)', labelEn: 'Contact Time (Speed)', value: '0.13–0.18 с' },
      { labelRu: 'Время контакта (Power)', labelEn: 'Contact Time (Power)', value: '0.17–0.21 с' },
      { labelRu: 'Время контакта (финалисты)', labelEn: 'Contact Time (finalists)', value: '0.15–0.17 с' },
      { labelRu: 'Угол проекции ЦМ', labelEn: 'CM Projection Angle', value: '46°–52°' }
    ]
  },
  talent: {
    titleRu: 'Талант-идентификация', titleEn: 'Talent Identification',
    rows: [
      { labelRu: 'Прыжок в длину с места (М)', labelEn: 'Standing Long Jump (M)', value: '> 3.00 м' },
      { labelRu: 'Прыжок в длину с места (Ж)', labelEn: 'Standing Long Jump (F)', value: '> 2.50 м' },
      { labelRu: 'Вертикальный прыжок (М)', labelEn: 'Sargeant Jump (M)', value: '> 0.70 м' },
      { labelRu: 'Вертикальный прыжок (Ж)', labelEn: 'Sargeant Jump (F)', value: '> 0.50 м' },
      { labelRu: 'Тройной прыжок с места (М)', labelEn: 'Standing Triple Jump (M)', value: '> 9.00 м' },
      { labelRu: 'Тройной прыжок с места (Ж)', labelEn: 'Standing Triple Jump (F)', value: '> 7.50 м' }
    ]
  },
  rsi: {
    titleRu: 'Реактивная сила (RSI)', titleEn: 'Reactive Strength Index (RSI)',
    rows: [
      { labelRu: 'Высокий RSI (дроп-тест)', labelEn: 'High RSI (drop jump test)', value: '> 2.5' },
      { labelRu: 'Формула', labelEn: 'Formula', value: 'RSI = Flight Time / Contact Time' }
    ]
  }
};

// === VOLUME GUIDELINES ===
const VOLUME_GUIDELINES = [
  { levelRu: 'Начинающий', levelEn: 'Beginner', contacts: '50-80', recovery: '72 часа', color: '#d4edda' },
  { levelRu: 'Средний', levelEn: 'Intermediate', contacts: '80-120', recovery: '48-72 часа', color: '#fff3cd' },
  { levelRu: 'Продвинутый', levelEn: 'Advanced', contacts: '120-200', recovery: '48 часов', color: '#f8d7da' }
];
