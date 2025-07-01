// Import word lists
import { VALIDWORDS } from '../Dictionary/validwords.js';
import { POSSIBLEWORDS } from '../Dictionary/possiblewords.js';

// Constants
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Global Variables
let Variations = []; // Saves the temperature maps for each column/letter
let ChosenWordLetters = []; // Saves the letters in order for todays word
let CurrentGuess = []; // Saves the current guess being submitted
let ColumnIndex = 0; // Saves the column/letter the player is on
let RowIndex = 0; // Saves the row/guess the player is on

// Start the game
StartGame();

document.getElementById('play-again-btn').addEventListener("click", () => {
    document.getElementById('game-message').classList.add('hidden');
    StartGame();
});

// Listen for keyboard letters to be pressed
document.querySelectorAll("#keyboard button").forEach(button => {
    button.addEventListener("click", () => {
        if (!button.getAttribute('data-key')) return;

        const Letter = button.getAttribute('data-key').toUpperCase();

        InsertLetter(Letter);
        ApplyTemperaturePattern();
        UpdateActiveCell();
    });
});

// Listen for keyboard 'Backspace' to be pressed
document.getElementById('Backspace').addEventListener("click", () => {
    RemoveLetter();
    ApplyTemperaturePattern();
    UpdateActiveCell();
});

// Listen for keyboard 'Enter' to be pressed
document.getElementById('Enter').addEventListener("click", () => { 
    if (CheckGuessValid() === true) CheckGuessCorrect();
    ApplyTemperaturePattern();
    UpdateActiveCell();
});

// Reset game state and set up for a new game
function StartGame() {
    // Reset game state
    Variations = [];
    ChosenWordLetters = [];
    CurrentGuess = [];
    ColumnIndex = 0;
    RowIndex = 0;


    // Generate Grid
    GenerateGrid();

    // Choose a word and split into an array with its position
    const ChosenWord = PickTodaysWord().toUpperCase();
    ChosenWordLetters = ChosenWord.split('');

    // Create array for temperature maps for each letter
    for (let i = 0; i < ChosenWordLetters.length; i++) {
        Variations[i] = {
            chosen: new Set([ChosenWordLetters[i]]),
            hot: new Set([]),
            warm: new Set([]),
            cool: new Set([]),
            cold: new Set([]),
            revealed: new Set([])
        };
    }

    // Apply temperature maps
    for (let i = 0; i < Variations.length; i++) {
        Variations[i] = SetTemperaturePattern(i);
    };

    ApplyTemperaturePattern();
    UpdateActiveCell();
}

// Generate the grid
function GenerateGrid() {
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = '';

    for (let row = 0; row < MAX_GUESSES; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('grid-row');
        rowDiv.setAttribute('data-row', row);

        for (let col = 0; col < WORD_LENGTH; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.setAttribute('data-col', col);

            cell.addEventListener('click', () => {
                {
                    ColumnIndex = col;
                    UpdateActiveCell();
                    ApplyTemperaturePattern();
                }
            });

            rowDiv.appendChild(cell);
        }

        gridContainer.appendChild(rowDiv);
    }
}

// Picks todays word from the list of possible words based on todays date
function PickTodaysWord() {
    const StartDate = new Date('2001-03-14');
    const Now = new Date();

    const diffInDays = Math.floor((Now - StartDate) / (1000 * 60 * 60 * 24));
    const Index = diffInDays % POSSIBLEWORDS.length;

    return POSSIBLEWORDS[Index];
}

// Applies a temperature pattern to a given variation
function SetTemperaturePattern(VariationIndex) {
    const ChosenLetter = ChosenWordLetters[VariationIndex];
    const Position = FindPosition(ChosenLetter);
    const Variation = Variations[VariationIndex];
    
    if (!Position) return Variations[VariationIndex];

    // Pattern for adjacent keys (hot)
    const OffsetPatternsHot = {
        // Top row (Q–P)
        0: [
            [0, -1], [0, 1],
            [1, -1], [1, 0]
        ],

        // Middle row (A–L)
        1: [
            [-1, 0], [-1, 1], 
            [0, -1], [0, 1],
            [1, 0]
        ],

        // Bottom row (Z–M)
        2: [
            [-1, 0],
            [0, -1], [0, 1]
        ]
    };

    // Pattern for keys 2 away (warm)
    const OffsetPatternsWarm = {
        // Top row (Q–P)
        0: [
            [0, -2], [0, 2],
            [1, -2], [1, 1],
            [2, -1], [2, 0], [2, 1]
        ],

        // Middle row (A–L)
        1: [
            [-1, -1], [-1, 2], 
            [0, -2], [0, 2],
            [1, -1], [1, 1]
        ],

        // Bottom row (Z–M)
        2: [
            [-2, 0], [-2, 1],
            [-1, -1], [-1, 1],
            [0, -2], [0, 2]
        ]
    };

    // Pattern for keys 3 away (cool)
    const OffsetPatternsCool = {
        // Top row (Q–P)
        0: [
            [0, -3], [0, 3],
            [1, -3], [1, 2],
            [2, -2], [2, 1]
        ],

        // Middle row (A–L)
        1: [
            [-1, -2], [-1, 3], 
            [0, -3], [0, 3],
            [1, -2], [1, 2]
        ],

        // Bottom row (Z–M)
        2: [
            [-2, -1], [-2, 2],
            [-1, -2], [-1, 2],
            [0, -3], [0, 3]
        ]
    };

    [
    { pattern: OffsetPatternsHot[Position.row], className: 'hot' },
    { pattern: OffsetPatternsWarm[Position.row], className: 'warm' },
    { pattern: OffsetPatternsCool[Position.row], className: 'cool' }
    ].forEach(({ pattern, className }) => {
        (pattern || []).forEach(([dr, dc]) => {
            const TargetRow = Position.row + dr;
            const TargetCol = Position.col + dc;

            const rowEl = document.querySelector(`.row[data-row="${TargetRow}"]`);
            if (rowEl) {
                const buttons = rowEl.querySelectorAll("button");
                const button = buttons[TargetCol];
                if (button && button.dataset.key) {
                    const TargetLetter = button.dataset.key.toUpperCase();
                    Variation[className].add(TargetLetter);
                }
            }
        });
    });

    ALPHABET.forEach(l => {
    if (
        !Variation.chosen.has(l) &&
        !Variation.hot.has(l) &&
        !Variation.warm.has(l) &&
        !Variation.cool.has(l)
    ) {
        Variation.cold.add(l);
    }
    });

    return Variation;
}

// Finds the position of a letter on the keyboard
function FindPosition(Letter) {
    const rows = document.querySelectorAll(".row");

    for (let r = 0; r < rows.length; r++) {
        const buttons = rows[r].querySelectorAll("button");
        
        for (let c = 0; c < buttons.length; c++) {
            
            // Check if the letter is equal to the one pressed
            if (buttons[c].dataset.key === Letter) {
                
                // Return row and column if key is found
                return { row: r, col: c };
            }
        }
    }

    // Return nothing if key is not found
    return null;
}

// Applies the revealed temperature pattern to the keyboard
function ApplyTemperaturePattern() {
    const Variation = Variations[ColumnIndex]
    const AllButtons = document.querySelectorAll('button[data-key]');

    AllButtons.forEach(button => {
        const Letter = button.getAttribute('data-key').toUpperCase();

        // Remove any existing temperature classes
        button.classList.remove('chosen', 'hot', 'warm', 'cool', 'cold', 'guess');
        button.classList.add('hidden')

        // Remove 'hidden' if already revealed
        if (Variation && Variation.revealed.has(Letter)){
            button.classList.remove('hidden');
        
            // Applies the temperature color to the revealed letter
            if (Variation.chosen.has(Letter)){
                button.classList.add('chosen');
            } else if (Variation.hot.has(Letter)) {
                button.classList.add('hot');
            } else if (Variation.warm.has(Letter)) {
                button.classList.add('warm');
            } else if (Variation.cool.has(Letter)) {
                button.classList.add('cool');
            } else if (Variation.cold.has(Letter)) {
                button.classList.add('cold');
            }
        }
    });
}

// Applies the revealed temperature pattern of the letters to the cells
function ApplyGridTemperaturePattern() {
    const Row = document.querySelector(`.grid-row[data-row="${RowIndex}"]`);
    if (!Row) return;

    for (let i = 0; i < WORD_LENGTH; i++) {
        const Cell = Row.querySelector(`.cell[data-col="${i}"]`);
        const Letter = CurrentGuess[i];

        if (!Letter || !Cell) continue;

        const Variation = Variations[i];

        // Remove any previous temperature classes
        Cell.classList.remove('chosen', 'hot', 'warm', 'cool', 'cold');

        void Cell.offsetWidth;

        if (Variation.revealed.has(Letter)) {
            // Apply correct temperature class
            if (Variation.chosen.has(Letter)) {
                Cell.classList.add('chosen');
            } else if (Variation.hot.has(Letter)) {
                Cell.classList.add('hot');
            } else if (Variation.warm.has(Letter)) {
                Cell.classList.add('warm');
            } else if (Variation.cool.has(Letter)) {
                Cell.classList.add('cool');
            } else if (Variation.cold.has(Letter)) {
                Cell.classList.add('cold');
            }
        }
    }
}

// Add a letter to the current guess
function InsertLetter(Letter) {
    const Row = document.querySelector(`.grid-row[data-row='${RowIndex}']`);
    const Cell = Row.querySelector(`.cell[data-col='${ColumnIndex}']`);

    if (Cell.textContent.trim() === "") {
        CurrentGuess[ColumnIndex] = Letter;

        Cell.textContent = Letter;
        ColumnIndex += 1;
        if (ColumnIndex > WORD_LENGTH - 1) ColumnIndex = WORD_LENGTH - 1;

        return true;
    }

    return false;
}

// Remove a letter from the current guess
function RemoveLetter() {
    const Row = document.querySelector(`.grid-row[data-row='${RowIndex}']`);
    let Cell = Row.querySelector(`.cell[data-col='${ColumnIndex}']`);
    
    if (Cell && Cell.textContent.trim() !== "") {
        CurrentGuess[ColumnIndex] = "";
        Cell.textContent = "";

        return true;
    }

    ColumnIndex -= 1;
    if (ColumnIndex < 0) {
        ColumnIndex = 0;
        return false;
    }

    Cell = Row.querySelector(`.cell[data-col='${ColumnIndex}']`);
    if (Cell) {
        CurrentGuess[ColumnIndex] = "";
        Cell.textContent = "";

        return true;
    }

    return false;
}

// Check if the current guess is a valid worda
function CheckGuessValid() {
    const Guess = CurrentGuess.join('').toLowerCase();
    return VALIDWORDS.includes(Guess);
}

// Check if the current guess is correct
function CheckGuessCorrect() {
    for (let i = 0; i < Variations.length; i++) {
        const Variation = Variations[i];

        Variation.revealed.add(CurrentGuess[i]); 
    }

    ApplyGridTemperaturePattern();

    for (let i = 0; i < CurrentGuess.length; i++) {
        if (CurrentGuess[i] !== ChosenWordLetters[i]) {
            // Move to next guess
            ColumnIndex = 0;
            RowIndex += 1;

            if (RowIndex >= MAX_GUESSES) {
            GameOver(); // ✅ Use your function here
            } else {
                CurrentGuess = [];
                ApplyTemperaturePattern();
            }

            return false;
        }
    }

    Success();
    return true;
}

// Updates the current active cell
function UpdateActiveCell() {
    // Remove existing active cells
    document.querySelectorAll('.cell.active').forEach(cell => {
        cell.classList.remove('active');
    });

    // Highlight the new active cell
    const currentRow = document.querySelector(`.grid-row[data-row='${RowIndex}']`);
    if (!currentRow) return;

    const currentCell = currentRow.querySelector(`.cell[data-col='${ColumnIndex}']`);
    if (currentCell) {
        currentCell.classList.add('active');
    }
}

function GameOver() {
    ShowMessage("Game Over");
}

function Success() {
    ShowMessage("You Win!");
}

function ShowMessage(title, text) {
  document.getElementById('message-title').textContent = title;
  document.getElementById('game-message').classList.remove('hidden');
}