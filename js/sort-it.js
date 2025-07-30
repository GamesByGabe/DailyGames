// Import word lists
import { VALIDWORDS } from '../Dictionary/validwords.js';
import { POSSIBLEWORDS } from '../Dictionary/possiblewords.js';

// Constants
const WORD_LENGTH = 5;
const MAX_GUESSES = 4;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

let gridCells = [];  // 1D array of cell DOM elements
let draggedIndex = null;

// Start the game
StartGame();

// Reset game state and set up for a new game
function StartGame() {
    // Generate Grid
    GenerateGrid();
}

// Generate the grid
function GenerateGrid() {
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = '';
    gridCells = [];

    for (let row = 0; row < WORD_LENGTH; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('grid-row');
        rowDiv.setAttribute('data-row', row);

        for (let col = 0; col < WORD_LENGTH; col++) {
            const index = row * WORD_LENGTH + col;
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.setAttribute('data-col', col);
            cell.setAttribute('draggable', true);
            cell.dataset.index = index;
            cell.textContent = index; // For visualization

            // Handle drag events
            // Events
            cell.addEventListener('dragstart', handleDragStart);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
            cell.addEventListener('dragleave', handleDragLeave);

            rowDiv.appendChild(cell);
            gridCells.push(cell);
        }

        gridContainer.appendChild(rowDiv);
    }
}

function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const target = this;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const threshold = 0.3; // 30% inside edge detection

    const direction = getDirectionFromHover(x, y, rect.width, rect.height, threshold);
    target.dataset.direction = direction;

    clearHighlights();
    target.classList.add(`drag-over-${direction}`);
}

function handleDragLeave() {
    this.removeAttribute('data-direction');
    clearHighlights();
}

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(this.dataset.index);
    const direction = this.dataset.direction;
    this.removeAttribute('data-direction');
    clearHighlights();

    if (direction && draggedIndex !== null && draggedIndex !== targetIndex) {
        shiftCell(draggedIndex, targetIndex, direction);
    }

    draggedIndex = null;
}

// Determine hover direction over a cell edge
function getDirectionFromHover(x, y, width, height, threshold) {
    const topEdge = y < height * threshold;
    const bottomEdge = y > height * (1 - threshold);
    const leftEdge = x < width * threshold;
    const rightEdge = x > width * (1 - threshold);

    if (topEdge) return 'top';
    if (bottomEdge) return 'bottom';
    if (leftEdge) return 'left';
    if (rightEdge) return 'right';
    return null;
}

// Shift the dragged cell into new index, pushing others
function shiftCell(fromIndex, toIndex, direction) {
    const fromCell = gridCells[fromIndex];
    let newIndex;

    switch (direction) {
        case 'top': newIndex = toIndex - WORD_LENGTH; break;
        case 'bottom': newIndex = toIndex + WORD_LENGTH; break;
        case 'left': newIndex = toIndex - 1; break;
        case 'right': newIndex = toIndex + 1; break;
        default: return;
    }

    if (newIndex < 0 || newIndex >= gridCells.length) return;

    // Shift the array
    const moved = gridCells.splice(fromIndex, 1)[0];
    gridCells.splice(newIndex, 0, moved);

    // Re-render the grid
    updateGrid();
}

function updateGrid() {
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = '';

    for (let i = 0; i < WORD_LENGTH; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('grid-row');

        for (let j = 0; j < WORD_LENGTH; j++) {
            const cell = gridCells[i * WORD_LENGTH + j];
            cell.dataset.index = i * WORD_LENGTH + j;
            rowDiv.appendChild(cell);
        }

        gridContainer.appendChild(rowDiv);
    }
}

function clearHighlights() {
    gridCells.forEach(cell => {
        cell.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right', 'dragging');
    });
}