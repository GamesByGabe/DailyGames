// Import word lists
import { VALIDWORDS } from '../Dictionary/validwords.js';
import { POSSIBLEWORDS } from '../Dictionary/possiblewords.js';

// Constants
const WORD_LENGTH = 5; // Sets the length of the words to be guessed in the grid
const MAX_GUESSES = 6; // Sets the number of possible guesses before failing the game
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); // Used to go through all letters in the keyboard

// Global Variables
let Variations = []; // Saves the temperature maps for each column/letter
let ChosenWordLetters = []; // Saves the letters in order for todays word
let CurrentGuess = []; // Saves the current guess being submitted
let ColumnIndex = 0; // Saves the column/letter the player is on
let RowIndex = 0; // Saves the row/guess the player is on

// Start the game
StartGame();

// Listen for play again button to reset game
document.getElementById('play-again-btn').addEventListener("click", () => {
    // Hide any messages on screen
    document.getElementById('game-message').classList.add('hidden');

    // Restart game
    StartGame();
});

// Listen for keyboard letters to be pressed
document.querySelectorAll("#keyboard button").forEach(button => {
    button.addEventListener("click", () => {
        if (!button.getAttribute('data-key')) return;
        // Get the letter which was pressed and insert it into the grid
        const Letter = button.getAttribute('data-key').toUpperCase();
        InsertLetter(Letter);

        // Update game state to current ColumnIndex
        ApplyTemperaturePattern();
        UpdateActiveCell();
    });
});

// Listen for keyboard 'Backspace' to be pressed
document.getElementById('Backspace').addEventListener("click", () => {
    // Remove the last or current indexed letter
    RemoveLetter();

    // Update game state to current ColumnIndex
    ApplyTemperaturePattern();
    UpdateActiveCell();
});

// Listen for keyboard 'Enter' to be pressed
document.getElementById('Enter').addEventListener("click", () => { 
    // Check if guess matches chosen word of the day
    CheckGuessCorrect();
    
    // Update game state to current ColumnIndex
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

    // Set the temperature maps for each letter in the chosen word
    for (let i = 0; i < Variations.length; i++) {
        Variations[i] = SetTemperaturePattern(i);
    };

    // Apply the starting pattern and active cell
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
    const StartDate = new Date(Date.UTC(2001, 2, 14));
    const Now = new Date();

    const diffInDays = Math.floor((Now.getTime() - StartDate.getTime()) / (1000 * 60 * 60 * 24));
    const Index = diffInDays % POSSIBLEWORDS.length;

    return POSSIBLEWORDS[Index];
}

// Applies a temperature pattern to a given variation
function SetTemperaturePattern(VariationIndex) {
    const ChosenLetter = ChosenWordLetters[VariationIndex];
    const Variation = Variations[VariationIndex];
    const Rows = document.querySelectorAll(".row");

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

    // Find the position of the chosen letter
    let Position = null;
    for (let r = 0; r < Rows.length; r++) {
        const buttons = Rows[r].querySelectorAll("button");
        
        for (let c = 0; c < buttons.length; c++) {
            // Check if the letter is equal to chosen letter
            if (buttons[c].dataset.key === ChosenLetter) {
                // Return row and column if chosen letter is found then exit loop
                Position = { row: r, col: c };
                break;
            }
        }
        if (Position) break;
    }
    if (!Position) return Variations[VariationIndex];

    // Apply the temperature to each key based on their relative position around the chosen letter
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

    // Set all left over keys to cold
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

    // Make sure the cell is empty
    if (Cell.textContent.trim() === "") {
        CurrentGuess[ColumnIndex] = Letter;
        Cell.textContent = Letter;

        // Find next empty cell to move to
        for (let c = ColumnIndex + 1; c < WORD_LENGTH; c++) {
            let NextCell = Row.querySelector(`.cell[data-col='${c}']`);

            if (NextCell && NextCell.textContent.trim() === "") {
                ColumnIndex = c;
                return true;
            }
        }

        // Go to last column if no empty cell was found
        ColumnIndex = WORD_LENGTH - 1;
        return true;
    }

    return false;
}

// Remove a letter from the current guess
function RemoveLetter() {
    const Row = document.querySelector(`.grid-row[data-row='${RowIndex}']`);
    let Cell = Row.querySelector(`.cell[data-col='${ColumnIndex}']`);
    
    // If the active cell is not empty, clear it
    if (Cell && Cell.textContent.trim() !== "") {
        CurrentGuess[ColumnIndex] = "";
        Cell.textContent = "";

        return;
    }

    // Move back a column unless already at column 0
    ColumnIndex -= 1;
    if (ColumnIndex < 0) {
        ColumnIndex = 0;

        return;
    }

    // Clear the new active cell
    Cell = Row.querySelector(`.cell[data-col='${ColumnIndex}']`);
    if (Cell) {
        CurrentGuess[ColumnIndex] = "";
        Cell.textContent = "";

        return;
    }

    return;
}

// Check if the current guess is correct
function CheckGuessCorrect() {
    // Check if guess is valid
    const Guess = CurrentGuess.join('').toLowerCase();
    if (VALIDWORDS.includes(Guess)) {

        // Add guessed letters to revealed set so their color is revealed
        for (let i = 0; i < Variations.length; i++) {
            const Variation = Variations[i];
            Variation.revealed.add(CurrentGuess[i]); 
        }

        // Apply the temperature pattern to the gird before updating row index
        ApplyGridTemperaturePattern();

        // Check if guess matches chosen word
        for (let i = 0; i < CurrentGuess.length; i++) {
            if (CurrentGuess[i] !== ChosenWordLetters[i]) {
                // Move to next guess if guess is not the chosen word
                ColumnIndex = 0;
                RowIndex += 1;

                // Check if all guesses have been used
                if (RowIndex >= MAX_GUESSES) {
                    GameOver();
                    return;
                } else {
                    CurrentGuess = [];
                    return;
                }
            }
        }

        // Guess matches chosen word
        Success();
        return;
    }

    // Guess is not a valid word
    return;
}

// Updates the current active cell
function UpdateActiveCell() {
    // Remove existing active cell
    document.querySelectorAll('.cell.active').forEach(cell => {
        cell.classList.remove('active');
    });

    // Highlight the new active cell
    const CurrentRow = document.querySelector(`.grid-row[data-row='${RowIndex}']`);
    if (!CurrentRow) return;

    const CurrentCell = CurrentRow.querySelector(`.cell[data-col='${ColumnIndex}']`);
    if (CurrentCell) {
        CurrentCell.classList.add('active');
    }
}

function GameOver() {
    ShowMessage("Game Over");
}

function Success() {
    ShowMessage("You Win!");
}

function ShowMessage(title) {
  document.getElementById('message-title').textContent = title;
  document.getElementById('game-message').classList.remove('hidden');
}