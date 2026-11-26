// Everwinter: estado da ficha, regras de rolagem e persistência local.

const STORAGE_KEY = 'everwinter-character-v5';

const ATTRIBUTE_NAMES = {
    FIS: 'Físico',
    AGI: 'Agilidade',
    INT: 'Intelecto',
    PRE: 'Presença'
};

const SKILLS = [
    ['Atletismo', 'FIS'],
    ['Acrobacia', 'AGI'],
    ['Furtividade', 'AGI'],
    ['Prestidigitação', 'AGI'],
    ['Arcanismo', 'INT'],
    ['História', 'INT'],
    ['Investigação', 'INT'],
    ['Medicina', 'INT'],
    ['Religião', 'INT'],
    ['Sobrevivência', 'INT'],
    ['Persuasão', 'PRE'],
    ['Intimidação', 'PRE'],
    ['Enganação', 'PRE'],
    ['Atuação', 'PRE'],
    ['Adestramento', 'PRE'],
    ['Intuição', 'PRE']
];

const COMBAT_SKILLS = [
    ['Luta', 'FIS/AGI'],
    ['Pontaria', 'AGI'],
    ['Magia', 'INT/PRE']
];

const SAVES = [
    ['Física', 'FIS'],
    ['Reflexos', 'AGI'],
    ['Mental', 'INT'],
    ['Social', 'PRE']
];

const XP_TABLE = [
    0, 100, 250, 450, 700,
    1000, 1400, 1900, 2500, 3200
];

const DICE = ['d4', 'd6', 'd8', 'd10', 'd12'];

let character = defaultCharacter();

// Define a estrutura padrão e inicializa campos que podem faltar em fichas importadas.
function defaultCharacter() {
    return {
        name: '',
        class: '',
        race: '',
        xp: 0,

        attributes: {
            FIS: 0,
            AGI: 0,
            INT: 0,
            PRE: 0
        },

        skills: {},

        trainedSaves: {
            Física: false,
            Reflexos: false,
            Mental: false,
            Social: false
        },

        currentHp: 0,
        maxHp: 0,
        currentMp: 0,
        maxMp: 0,
        defense: 0,
        damageReduction: 0,
        money: 0,

        equipment: '',
        inventory: '',

        spells: {
            0: '',
            1: '',
            2: '',
            3: '',
            4: '',
            5: ''
        },

        notes: ''
    };
}

// Normaliza fichas importadas, preenchendo estruturas e campos ausentes.
function normalizeCharacter(data) {
    const base = defaultCharacter();

    return {
        ...base,
        ...data,

        attributes: {
            ...base.attributes,
            ...(data.attributes || {})
        },

        skills: {
            ...base.skills,
            ...(data.skills || {})
        },

        trainedSaves: {
            ...base.trainedSaves,
            ...(data.trainedSaves || {})
        },

        spells: {
            ...base.spells,
            ...(data.spells || {})
        }
    };
}

// Converte pontos de 0 a 4 no dado e calcula o nível a partir do XP.
function dieFromPoints(points) {
    const index = Math.max(
        0,
        Math.min(4, Number(points) || 0)
    );

    return DICE[index];
}

function attributePoints(key) {
    return Number(character.attributes[key]) || 0;
}

function attributeDie(key) {
    return dieFromPoints(attributePoints(key));
}

function skillPoints(name) {
    return Number(character.skills[name]) || 0;
}

function skillDie(name) {
    return dieFromPoints(skillPoints(name));
}

function levelFromXP(xp) {
    let level = 1;

    XP_TABLE.forEach((threshold, index) => {
        if (Number(xp) >= threshold) {
            level = index + 1;
        }
    });

    return Math.min(10, level);
}

// Cria os cartões de atributos com pontos editáveis e rolagem clicável.
function renderAttributes() {
    const root = document.querySelector('#attributes');

    root.innerHTML = '';

    Object.entries(ATTRIBUTE_NAMES).forEach(([key, name]) => {
        const card = document.createElement('div');

        card.className = 'attribute-card';

        card.innerHTML = `
            <button class="attribute-roll" data-roll-attribute="${key}">
                <span class="attribute-name">${name} (${key})</span>
                <span class="die-label">${attributeDie(key)}</span>
            </button>

            <div class="points-row">
                <span class="help">Pontos</span>

                <input
                    data-attribute="${key}"
                    aria-label="Pontos de ${name}"
                    type="number"
                    min="0"
                    max="4"
                    value="${attributePoints(key)}"
                >
            </div>
        `;

        root.append(card);
    });
}

// Monta as perícias: cada uma possui seu próprio dado e atributo-base.
function renderSkills(list, rootId) {
    const root = document.querySelector(rootId);

    root.innerHTML = '';

    list.forEach(([name, attribute]) => {
        const card = document.createElement('div');

        card.className = 'skill-card';

        const button = document.createElement('button');

        button.className = 'roll-button';
        button.dataset.roll = name;
        button.dataset.attribute = attribute;

        button.innerHTML = `
            <span>
                ${name} <small>(${attribute})</small>
                <br>
                <strong>${skillDie(name)}</strong>
            </span>
        `;

        const label = document.createElement('label');

        label.className = 'skill-points';

        label.innerHTML = `
            <span>Pts</span>

            <input
                data-skill-points="${name}"
                aria-label="Pontos em ${name}"
                type="number"
                min="0"
                max="4"
                value="${skillPoints(name)}"
            >
        `;

        card.append(button, label);

        root.append(card);
    });
}

// Salvaguardas treinadas usam dois dados do mesmo atributo; o checkbox não é recriado ao alternar.
function renderSaves() {
    const root = document.querySelector('#saves');

    root.innerHTML = '';

    SAVES.forEach(([name, key]) => {
        const card = document.createElement('div');

        card.className = 'save-card';

        const button = document.createElement('button');

        button.className = 'roll-button save-roll';
        button.dataset.saveRoll = name;
        button.dataset.attribute = key;

        const diceText = character.trainedSaves[name]
            ? `${attributeDie(key)} / ${attributeDie(key)}`
            : attributeDie(key);

        button.innerHTML = `
            <span>
                ${name} (${key})
                <br>
                <strong>${diceText}</strong>
            </span>
        `;

        const label = document.createElement('label');

        label.className = 'training';

        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.dataset.trainedSave = name;
        checkbox.checked = Boolean(character.trainedSaves[name]);

        label.append(
            checkbox,
            document.createTextNode(' Treinada')
        );

        card.append(button, label);

        root.append(card);
    });
}

// Atualiza todos os elementos visuais e sincroniza o conteúdo da ficha.
function render() {
    renderAttributes();

    renderSkills(SKILLS, '#skills');
    renderSkills(COMBAT_SKILLS, '#combatSkills');

    renderSaves();

    fillFields();
    fillSpells();

    updateLevelDisplay();
}

function fillFields() {
    document.querySelectorAll('[data-field]').forEach(element => {
        const key = element.dataset.field;

        if (key in character) {
            element.value = character[key] ?? '';
        }
    });
}

function fillSpells() {
    document.querySelectorAll('[data-magic]').forEach(element => {
        element.value = character.spells[element.dataset.magic] ?? '';
    });
}

function readFields() {
    document.querySelectorAll('[data-field]').forEach(element => {
        character[element.dataset.field] = element.value;
    });

    document.querySelectorAll('[data-magic]').forEach(element => {
        character.spells[element.dataset.magic] = element.value;
    });
}

function updateLevelDisplay() {
    const levelField = document.querySelector('#levelDisplay');

    if (levelField) {
        levelField.value = levelFromXP(character.xp);
    }
}

// Salva automaticamente no navegador e atualiza a indicação de estado.
function saveLocal() {
    readFields();

    character.xp = Math.max(
        0,
        Number(character.xp) || 0
    );

    updateLevelDisplay();

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(character)
    );

    const status = document.querySelector('#saveStatus');

    if (status) {
        status.textContent = 'Ficha salva localmente';
    }
}

function loadLocal() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            character = normalizeCharacter(JSON.parse(saved));
        }
    } catch (error) {
        console.warn(
            'Não foi possível carregar a ficha local:',
            error
        );
    }
}

// Rolagem dos dados e interpretação de crítico ou falha crítica.
function rollDie(die) {
    const sides = Number(die.slice(1));

    return Math.floor(Math.random() * sides) + 1;
}

function resolveTwoDice(first, second) {
    const failure =
        (first === 1 && second === 1) ||
        (first === 2 && second === 2);

    const critical =
        first === second && first >= 5;

    return {
        result: critical
            ? first + second
            : Math.max(first, second),

        state: failure
            ? 'failure'
            : critical
                ? 'critical'
                : '',

        label: failure
            ? 'Falha crítica'
            : critical
                ? 'Crítico'
                : ''
    };
}

function rollAttribute(key) {
    const die = attributeDie(key);

    const result = rollDie(die);

    addLog(
        `${ATTRIBUTE_NAMES[key]} (${key})`,
        result,
        `${die}: ${result}`
    );

    return result;
}

// Perícias flexíveis usam o atributo de maior pontuação como base.
function rollSkill(name, attribute) {
    const keys = attribute.split('/');

    const key = keys.reduce(
        (best, current) =>
            attributePoints(current) > attributePoints(best)
                ? current
                : best,
        keys[0]
    );

    const attributeDice = attributeDie(key);
    const skillDice = skillDie(name);

    const attributeResult = rollDie(attributeDice);
    const skillResult = rollDie(skillDice);

    const outcome = resolveTwoDice(
        attributeResult,
        skillResult
    );

    const detail = `
        ${key} ${attributeDice}: ${attributeResult}
        | Perícia ${skillDice}: ${skillResult}
        ${outcome.label ? `— ${outcome.label}` : ''}
    `.trim();

    addLog(
        name,
        outcome.result,
        detail,
        outcome.state
    );

    return outcome.result;
}

// Salvaguarda não treinada rola um dado; treinada rola dois e usa a regra combinada.
function rollSave(name, key) {
    const die = attributeDie(key);

    const first = rollDie(die);

    if (!character.trainedSaves[name]) {
        addLog(
            name,
            first,
            `${key} ${die}: ${first}`
        );

        return first;
    }

    const second = rollDie(die);

    const outcome = resolveTwoDice(first, second);

    const detail = `
        ${key} ${die}: ${first}
        | ${key} ${die}: ${second}
        ${outcome.label ? `— ${outcome.label}` : ''}
    `.trim();

    addLog(
        name,
        outcome.result,
        detail,
        outcome.state
    );

    return outcome.result;
}

// Registra resultados com texto seguro e destaca resultados especiais.
function addLog(name, result, detail = '', state = '') {
    const log = document.querySelector('#logEntries');

    if (log.querySelector('.help')) {
        log.innerHTML = '';
    }

    const entry = document.createElement('div');

    entry.className = `log-entry ${state}`;

    const title = document.createElement('div');

    title.append(
        document.createTextNode(`${name}: `)
    );

    const value = document.createElement('strong');

    value.textContent = String(result);

    title.append(value);

    const description = document.createElement('small');

    description.textContent = detail;

    entry.append(title, description);

    log.prepend(entry);
}

// Exporta JSON e importa fichas existentes com normalização de campos.
function exportJSON() {
    readFields();

    character.xp = Math.max(
        0,
        Number(character.xp) || 0
    );

    const blob = new Blob(
        [JSON.stringify(character, null, 4)],
        { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `everwinter-${(
        character.name || 'personagem'
    ).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.json`;

    link.click();

    URL.revokeObjectURL(url);
}

function importJSON(file) {
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        try {
            character = normalizeCharacter(
                JSON.parse(reader.result)
            );

            render();
            saveLocal();

            alert('Ficha importada e salva localmente.');
        } catch (error) {
            alert('Arquivo JSON inválido ou incompatível.');

            console.error(error);
        }
    };

    reader.readAsText(file);
}

// Delegação de eventos permite reconstruir cartões sem perder seus comportamentos.
document.addEventListener('click', event => {
    const attributeButton = event.target.closest(
        '[data-roll-attribute]'
    );

    if (attributeButton) {
        rollAttribute(
            attributeButton.dataset.rollAttribute
        );

        return;
    }

    const saveButton = event.target.closest('[data-save-roll]');

    if (saveButton) {
        rollSave(
            saveButton.dataset.saveRoll,
            saveButton.dataset.attribute
        );

        return;
    }

    const skillButton = event.target.closest('[data-roll]');

    if (skillButton) {
        rollSkill(
            skillButton.dataset.roll,
            skillButton.dataset.attribute
        );
    }
});

// Checkbox de treinamento persiste a escolha e atualiza apenas o dado exibido.
document.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-trained-save]');

    if (!checkbox) {
        return;
    }

    character.trainedSaves[
        checkbox.dataset.trainedSave
    ] = checkbox.checked;

    saveLocal();

    const card = checkbox.closest('.save-card');

    const button = card.querySelector('[data-save-roll]');

    const name = button.dataset.saveRoll;
    const key = button.dataset.attribute;

    button.querySelector('strong').textContent =
        character.trainedSaves[name]
            ? `${attributeDie(key)} / ${attributeDie(key)}`
            : attributeDie(key);
});

// Campos de pontos e texto salvam automaticamente; XP também recalcula o nível.
document.addEventListener('input', event => {
    if (event.target.matches('[data-attribute]')) {
        const key = event.target.dataset.attribute;

        character.attributes[key] = Math.max(
            0,
            Math.min(4, Number(event.target.value) || 0)
        );

        renderAttributes();
        renderSaves();

        saveLocal();
    } else if (event.target.matches('[data-skill-points]')) {
        const name = event.target.dataset.skillPoints;

        character.skills[name] = Math.max(
            0,
            Math.min(4, Number(event.target.value) || 0)
        );

        renderSkills(SKILLS, '#skills');
        renderSkills(COMBAT_SKILLS, '#combatSkills');

        saveLocal();
    } else if (event.target.matches('[data-field]')) {
        character[event.target.dataset.field] = event.target.value;

        if (event.target.dataset.field === 'xp') {
            updateLevelDisplay();
        }

        saveLocal();
    } else if (event.target.matches('[data-magic]')) {
        character.spells[
            event.target.dataset.magic
        ] = event.target.value;

        saveLocal();
    }
});

// Controles de arquivo, histórico e criação de uma ficha nova.
document.querySelector('#exportBtn').addEventListener(
    'click',
    exportJSON
);

document.querySelector('#importFile').addEventListener(
    'change',
    event => {
        importJSON(event.target.files[0]);

        event.target.value = '';
    }
);

document.querySelector('#clearLog').addEventListener(
    'click',
    () => {
        document.querySelector('#logEntries').innerHTML = `
            <p class="help">
                Clique em um atributo, perícia ou salvaguarda para rolar.
            </p>
        `;
    }
);

document.querySelector('#resetBtn').addEventListener(
    'click',
    () => {
        if (
            !confirm(
                'Criar uma ficha nova? Isso substituirá a ficha salva neste navegador.'
            )
        ) {
            return;
        }

        character = defaultCharacter();

        render();
        saveLocal();
    }
);

// Inicializa a interface com a ficha armazenada ou com os valores padrão.
loadLocal();
render();
