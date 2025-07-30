// Import word lists
import { VALIDWORDS } from '../assets/shared-js/validwords.js';
import { POSSIBLEWORDS } from '../assets/shared-js/possiblewords.js';

// Constants
const WORD_LENGTH = 5; // Sets the length of the words to be guessed in the grid
const MAX_GUESSES = 6; // Sets the number of possible guesses before failing the game
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); // Used to go through all letters in the keyboard

// Global variables
let Variations = []; // Saves the temperature maps for each column/letter
let ChosenWordLetters = []; // Saves the letters in order for todays word
let CurrentGuess = []; // Saves the current guess being submitted
let ColumnIndex = 0; // Saves the column/letter the player is on
let RowIndex = 0; // Saves the row/guess the player is on
let ProcessingInput = false // Flag to prevent unintended letter inputs when repeatedly clicking the same button quickly
let GameEnded = false; // Denotes whether the game has ended and new guesses cant be made
let InDemo = false; // Denotes whether the demo is open to prevent the info button from being pressed again
const DemoWord = ['G', 'A', 'M', 'E', 'S'];
let DemoIndex = 0;
let DemoInterval = null;

const KEYBOARD_TEMPERATURE_OFFSETS = {
    // Pattern for adjacent keys (hot)
    hot: {
        // Top row (Q–P)
        0: [[0, -1], [0, 1],
            [1, -1], [1, 0]],

        // Middle row (A–L)
        1: [[-1, 0], [-1, 1], 
            [0, -1], [0, 1],
            [1, 0]],

        // Bottom row (Z–M)
        2: [[-1, 0],
            [0, -1], [0, 1]]
    },

    // Pattern for keys 2 away (warm)
    warm: {
        // Top row (Q–P)
        0: [[0, -2], [0, 2],
            [1, -2], [1, 1],
            [2, -1], [2, 0], [2, 1]],

        // Middle row (A–L)
        1: [[-1, -1], [-1, 2], 
            [0, -2], [0, 2],
            [1, -1], [1, 1]],

        // Bottom row (Z–M)
        2: [[-2, 0], [-2, 1],
            [-1, -1], [-1, 1],
            [0, -2], [0, 2]]
    },

    // Pattern for keys 3 away (cool)
    cool: {
        // Top row (Q–P)
        0: [[0, -3], [0, 3],
            [1, -3], [1, 2],
            [2, -2], [2, 1]],

        // Middle row (A–L)
        1: [[-1, -2], [-1, 3], 
            [0, -3], [0, 3],
            [1, -2], [1, 2]],

        // Bottom row (Z–M)
        2: [[-2, -1], [-2, 2],
            [-1, -2], [-1, 2],
            [0, -3], [0, 3]]
    }
};

// Show the game title
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("game-title").textContent = "Temp-It";
});

document.getElementById('menu-button').addEventListener('click', () => {
    setTimeout(() => {
        HideMessage();
    }, 1500); 
    ShowMessage("More Games Coming Soon!");
});

// Listen for info button to be pressed
document.getElementById('info-button').addEventListener('click', () => {
    if (!InDemo) {
        document.getElementById('info-box').classList.remove('collapsed');
        InDemo = true;
        DemoInterval = setInterval(() => CycleDemo(DemoIndex), 3000); 
        CycleDemo(DemoIndex);
        return;
    }
    return;
});

// Listen for info box close button to be pressed
document.getElementById('close-button').addEventListener('click', () => {
  document.getElementById('info-box').classList.add('collapsed');
  InDemo = false;
  clearInterval(DemoInterval);
  DemoIndex = 0; 
  const keyboardKeys = document.querySelectorAll('#example-keyboard .key');
  keyboardKeys.forEach(key => {
    key.classList.remove('chosen', 'hot', 'warm', 'cool', 'cold');
  });
  const gridCells = document.querySelectorAll('#example-grid .cell');
  gridCells.forEach(cell => cell.classList.remove('active-demo'));
});

document.querySelectorAll("#keyboard button").forEach(button => {
    button.addEventListener("click", () => {
        if (GameEnded === false && ProcessingInput === false) {
            ProcessingInput = true;

            const Button = button.getAttribute('data-key').toUpperCase();

            if (Button === 'ENTER') {
                CheckGuessCorrect();
            } else if (Button === 'BACKSPACE') {
                RemoveLetter();
            } else if (Button) {
                InsertLetter(Button);
            } else {
                ProcessingInput = false; // Reset if no valid action was taken
                return;
            }

            // Update game state to current ColumnIndex
            ApplyTemperaturePattern();
            UpdateActiveCell();

            setTimeout(() => {
                ProcessingInput = false;
            }, 25);

        }
        else return;
    });
});


// Start the game
StartGame();

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
    const GridContainer = document.getElementById('grid');
    GridContainer.innerHTML = '';

    for (let Row = 0; Row < MAX_GUESSES; Row++) {
        const RowDiv = document.createElement('div');
        RowDiv.classList.add('grid-row');
        RowDiv.setAttribute('data-row', Row);

        for (let Col = 0; Col < WORD_LENGTH; Col++) {
            const Cell = document.createElement('div');
            Cell.classList.add('cell');
            Cell.setAttribute('data-col', Col);

            Cell.addEventListener('click', () => {
                {
                    ColumnIndex = Col;
                    UpdateActiveCell();
                    ApplyTemperaturePattern();
                }
            });

            RowDiv.appendChild(Cell);
        }

        GridContainer.appendChild(RowDiv);
    }
}

// Picks todays word from the list of possible words based on todays date
function PickTodaysWord() {
    const StartDate = new Date(Date.UTC(2001, 2, 14)); // Alyisia's birthday :)
    const Now = new Date();

    const DiffInDays = Math.floor((Now.getTime() - StartDate.getTime()) / (1000 * 60 * 60 * 24));
    const Index = DiffInDays % POSSIBLEWORDS.length;

    return POSSIBLEWORDS[Index];
}

// Applies a temperature pattern to a given variation
function SetTemperaturePattern(VariationIndex) {
    const ChosenLetter = ChosenWordLetters[VariationIndex];
    const Variation = Variations[VariationIndex];
    const Rows = document.querySelectorAll(".row");

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
        { pattern: KEYBOARD_TEMPERATURE_OFFSETS.hot[Position.row], className: 'hot' },
        { pattern: KEYBOARD_TEMPERATURE_OFFSETS.warm[Position.row], className: 'warm' },
        { pattern: KEYBOARD_TEMPERATURE_OFFSETS.cool[Position.row], className: 'cool' }
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

        if (Variation && Variation.revealed.has(Letter)){
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
            const delay = i * 300 + RowIndex * 50; // in ms

            setTimeout(() => {
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

                Cell.classList.add('reveal'); // trigger animation if needed
            }, delay);
        }
    }
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
                    GameEnded = true;
                    setTimeout(() => {
                        HideMessage();
                    }, 2000); 
                    ShowMessage("Game Over");
                    return;
                } else {
                    CurrentGuess = [];
                    return;
                }
            }
        }

        // Guess matches the chosen word
        GameEnded = true;
        setTimeout(() => {
            HideMessage();
        }, 2000); 
        switch (RowIndex) {
            case 0:
                ShowMessage("Lucky guess!");
                break;

            case 1:
                ShowMessage("Impressive!");
                break;
                
            case 2:
                ShowMessage("Great job!");
                break;
            
            case 3:
                ShowMessage("Good job!");
                break;

            case 4:
                ShowMessage("You did it!");
                break;

            case 5:
                ShowMessage("That was close!");
                break;

            default:
                break;
        }
        return;
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (CurrentGuess[i] === '' || CurrentGuess[i] === undefined) {
            setTimeout(() => {
                HideMessage();
            }, 1250); 
            ShowMessage("Not enough letters");
            return;
        }
    }

    // Guess is not a valid word
    setTimeout(() => {
        HideMessage();
    }, 1250); 
    ShowMessage("Not in word list");
    return;
}

// Unhides the message box to display a given message
function ShowMessage(message) {
    document.getElementById('message-content').textContent = message;
    document.getElementById('message-box').classList.remove('hidden');
    document.getElementById('message-box').classList.add('reveal');
}

// Resets the message box to be hidden
function HideMessage() {
    document.getElementById('message-box').classList.remove('reveal');
    document.getElementById('message-box').classList.add('hidden');
}

function CycleDemo() {
    const ChosenLetter = DemoWord[DemoIndex];
    const gridCells = document.querySelectorAll('#example-grid .cell');
    const demoKeyboardKeys = document.querySelectorAll('#example-keyboard .key, #example-keyboard .wide-key');

    // Clear previous temperature pattern from demo grid
    gridCells.forEach(cell => cell.classList.remove('active-demo'));

    // Clear previous temperature pattern from demo keyboard
    demoKeyboardKeys.forEach(key => {
        key.classList.remove('chosen', 'hot', 'warm', 'cool', 'cold');
    });

    // Set active cell in demo grid
    const activeCell = document.querySelector(`#example-grid .cell[data-col="${DemoIndex}"]`);
    if (activeCell) {
        activeCell.classList.add('active-demo');
    }

    // Create a temporary 'Variation' object for the demo's current letter
    const demoVariation = {
        chosen: new Set([ChosenLetter]),
        hot: new Set(),
        warm: new Set(),
        cool: new Set(),
        cold: new Set(),
        revealed: new Set()
    };

    // Find the letter's position on the demo keyboard
    let position = null;
    const demoKeyboardRows = document.querySelectorAll('#example-keyboard .info-keyboard-row'); 
    for (let r = 0; r < demoKeyboardRows.length; r++) {
        const keysInRow = demoKeyboardRows[r].querySelectorAll('div[data-key]'); 
        for (let c = 0; c < keysInRow.length; c++) {
            if (keysInRow[c].dataset.key === ChosenLetter) {
                position = { row: r, col: c };
                break;
            }
        }
        if (position) break;
    }

    if (!position) {
        console.warn(`Demo: ChosenLetter "${ChosenLetter}" not found on demo keyboard.`);
        return;
    }

    // Apply temperature classes using the global constant
    Object.entries(KEYBOARD_TEMPERATURE_OFFSETS).forEach(([type, offsets]) => {
        const pattern = offsets[position.row] || [];
        pattern.forEach(([dr, dc]) => {
            const r = position.row + dr;
            const c = position.col + dc;
            const rowEl = document.querySelector(`#example-keyboard .info-keyboard-row[data-row="${r}"]`); 
            if (rowEl) {
                const keysInRow = rowEl.querySelectorAll('div[data-key]');
                const key = keysInRow[c];
                if (key && key.dataset.key) {
                    const TargetLetter = key.dataset.key.toUpperCase();
                    demoVariation[type].add(TargetLetter);
                }
            }
        });
    });

    // Apply "cold" to all other uncolored keys in the demo keyboard
    ALPHABET.forEach(l => {
        if (
            !demoVariation.chosen.has(l) &&
            !demoVariation.hot.has(l) &&
            !demoVariation.warm.has(l) &&
            !demoVariation.cool.has(l)
        ) {
            demoVariation.cold.add(l);
        }
    });

    // Apply the classes to the demo keyboard elements
    demoKeyboardKeys.forEach(keyElement => {
        const Letter = keyElement.dataset.key; 
        if (!Letter) return;

        if (demoVariation.chosen.has(Letter)){
            keyElement.classList.add('chosen');
        } else if (demoVariation.hot.has(Letter)) {
            keyElement.classList.add('hot');
        } else if (demoVariation.warm.has(Letter)) {
            keyElement.classList.add('warm');
        } else if (demoVariation.cool.has(Letter)) {
            keyElement.classList.add('cool');
        } else if (demoVariation.cold.has(Letter)) {
            keyElement.classList.add('cold');
        }
    });

    // Increment DemoIndex for the next cycle
    DemoIndex = (DemoIndex + 1) % DemoWord.length;
}