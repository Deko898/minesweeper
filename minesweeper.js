// CONFIG
const GAME_MODES = {
  BEGINNER: {
    CELLS: 9,
    ROWS: 9,
    TOTAL_BOMBS: 10,
  },
  INTERMEDIATE: {
    CELLS: 16,
    ROWS: 16,
    TOTAL_BOMBS: 40,
  },
  EXPERT: {
    CELLS: 30,
    ROWS: 16,
    TOTAL_BOMBS: 99,
  },
};

const BOMB_SYMBOL = "B";

// MODELS
class Cell {
  imgUrl = "https://minesweeper.online/img/skins/hd/closed.svg?v=2";
  bombUrl = "https://minesweeper.online/img/skins/hd/mine_red.svg?v=2";
  emptyUrl = "https://minesweeper.online/img/skins/hd/type0.svg?v=2";
  flaggedUrl = "https://minesweeper.online/img/skins/hd/flag.svg?v=2";
  id;
  opened;
  value;
  flagged;
  bgColorsMap = {
    1: "blue",
    2: "green",
    3: "red",
    4: "darkblue",
    5: "brown",
    6: "cyan",
    7: "black",
    8: "grey",
  };
  constructor(id, opened, value) {
    this.id = id;
    this.opened = opened;
    this.value = value;
  }

  incrementValue() {
    this.value++;
  }
}

// for rendering the template grid
let dataGrid = [];

// cell map
let cellsMap = new Map();

// cells array for logic iteration
let cellsFlat = [];
let selectedMode = GAME_MODES.BEGINNER;
let durationIntervalId = null;

// ELEMENT TEMPALTES
const faceElement = document.getElementById("face");
faceElement.addEventListener("click", handleRestartGame);
const overlay = document.getElementById("game-over-overlay");
const totalBombsEl = document.getElementById("total-bombs");
const durationEl = document.getElementById("duration");
const radioModeElements = document.querySelectorAll("input[name='mode']");
radioModeElements.forEach((input) => {
  input.addEventListener("change", modeChange);
});

// UTILS
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function deepCopy(data) {
  return JSON.parse(JSON.stringify(data));
}

function clearDurationInteval() {
  if (durationIntervalId) {
    clearInterval(durationIntervalId);
    durationIntervalId = null;
  }
}

// CELLS
function getCellNeighbours(rowIndex, cellIndex) {
  const leftCell = cellsMap.get(`${rowIndex}-${cellIndex - 1}`);
  const leftUpCell = cellsMap.get(`${rowIndex - 1}-${cellIndex - 1}`);
  const upCell = cellsMap.get(`${rowIndex - 1}-${cellIndex}`);
  const upRightCell = cellsMap.get(`${rowIndex - 1}-${cellIndex + 1}`);
  const rightCell = cellsMap.get(`${rowIndex}-${cellIndex + 1}`);
  const downRightCell = cellsMap.get(`${rowIndex + 1}-${cellIndex + 1}`);
  const downCell = cellsMap.get(`${rowIndex + 1}-${cellIndex}`);
  const downLeftCell = cellsMap.get(`${rowIndex + 1}-${cellIndex - 1}`);

  return [
    leftCell,
    leftUpCell,
    upCell,
    upRightCell,
    rightCell,
    downRightCell,
    downCell,
    downLeftCell,
  ];
}

function placeBombs(mode) {
  let i = 0;
  while (i < mode.TOTAL_BOMBS) {
    const randomRow = getRandomInt(mode.ROWS);
    const randomCell = getRandomInt(mode.CELLS);
    const cell = cellsMap.get(`${randomRow}-${randomCell}`);

    if (cell.value !== BOMB_SYMBOL) {
      i++;
      cell.value = BOMB_SYMBOL;
    }
  }
}

function sumBombCellNeighbours() {
  cellsFlat.forEach((cell) => {
    if (cell.value === BOMB_SYMBOL) {
      const [rowIndex, cellIndex] = cell.id.split("-");
      const neighbours = getCellNeighbours(+rowIndex, +cellIndex);
      neighbours.forEach((neighbour) => {
        if (neighbour !== undefined && neighbour.value !== BOMB_SYMBOL) {
          neighbour.incrementValue();
        }
      });
    }
  });
}

function openEmptyNeighbours(id) {
  const [rowIndex, cellIndex] = id.split("-");
  const neighbours = getCellNeighbours(+rowIndex, +cellIndex);

  neighbours.forEach((neighbour) => {
    if (neighbour && !neighbour.opened) {
      neighbour.opened = true;
      if (neighbour.value === 0) {
        openEmptyNeighbours(neighbour.id);
      }
    }
  });
}

function displayBombs() {
  cellsFlat.forEach((cell) => {
    if (cell.value === BOMB_SYMBOL) {
      cell.opened = true;
      cell.flagged = false;
    }
  });
}

function displayFlags() {
  cellsFlat.forEach((cell) => {
    if (cell.value === BOMB_SYMBOL) {
      cell.flagged = true;
    }
  });
}

function isGameWon() {
  return cellsFlat
    .filter((cell) => cell.value !== BOMB_SYMBOL)
    .every((cell) => cell.opened);
}

function getTotalCellsFlagged() {
  return (
    selectedMode.TOTAL_BOMBS - cellsFlat.filter((cell) => cell.flagged).length
  );
}

// EVENTS
function handleCellClick(event) {
  const cell = cellsMap.get(event.target.id);
  cell.opened = true;
  if (cell.value === BOMB_SYMBOL) {
    gameOver();
  } else if (cell.value === 0) {
    openEmptyNeighbours(cell.id);
  } else {
    if (isGameWon()) {
      gameWon();
    }
  }
  renderCells();
}

function handleRightClick(event) {
  event.preventDefault();
  const cell = cellsMap.get(event.target.id);
  if (!cell.opened) {
    cell.flagged = !cell.flagged;
    renderCells();
  }
  renderBombsLeft();
}

function handleRestartGame() {
  cellsMap = new Map();
  dataGrid = [];
  startGame(selectedMode);
}

function modeChange(event) {
  selectedMode = GAME_MODES[event.target.value];
  handleRestartGame();
}

// RENDER
function renderCells() {
  const gameTemplate = document.getElementById("game");
  gameTemplate.innerHTML = "";
  dataGrid.forEach((rows) => {
    const rowEl = document.createElement("div");
    rowEl.setAttribute("class", "row");
    rows.forEach((cell) => {
      const cellEl = document.createElement("span");
      cellEl.setAttribute("class", "cell");
      cellEl.setAttribute("id", cell.id);

      if (cell.opened) {
        cellEl.setAttribute("class", "cell opened");

        if (cell.value === BOMB_SYMBOL) {
          cellEl.style.backgroundImage = "url(" + cell.bombUrl + ")";
        } else {
          cellEl.style.backgroundImage = "url(" + cell.emptyUrl + ")";
        }

        if (cell.value !== 0 && cell.value !== BOMB_SYMBOL) {
          cellEl.innerHTML = cell.value;
        }
      } else if (cell.flagged) {
        cellEl.innerHTML = "";
        cellEl.style.backgroundImage = "url(" + cell.flaggedUrl + ")";
      } else {
        cellEl.style.backgroundImage = "url(" + cell.imgUrl + ")";
      }
      cellEl.style.color = cell.bgColorsMap[cell.value];
      cellEl.addEventListener("click", handleCellClick);
      cellEl.addEventListener("contextmenu", handleRightClick);
      rowEl.appendChild(cellEl);
    });
    gameTemplate.appendChild(rowEl);
  });
}

function renderBombsLeft() {
  totalBombsEl.textContent = getTotalCellsFlagged();
}

function renderGameDuration() {
  let duration = 0;
  durationEl.textContent = duration;
  durationIntervalId = setInterval(() => {
    duration += 1;
    durationEl.textContent = duration;
  }, 1000);
}

// APP
function initBoardData(mode) {
  face.style.backgroundImage =
    "url(https://minesweeper.online/img/skins/hd/face_unpressed.svg?v=2)";
  overlay.style.display = "none";
  for (let i = 0; i < mode.ROWS; i++) {
    dataGrid.push([]);
    for (let j = 0; j < mode.CELLS; j++) {
      const cell = new Cell(`${i}-${j}`, false, 0);
      cellsMap.set(`${i}-${j}`, cell);
      dataGrid[i].push(cell);
    }
  }

  cellsFlat = [...cellsMap.values()];
}

function gameOver() {
  overlay.style.display = "block";
  face.style.backgroundImage =
    "url(https://minesweeper.online/img/skins/hd/face_lose.svg?v=2)";
  displayBombs();
  clearDurationInteval();
}

function gameWon() {
  overlay.style.display = "block";
  face.style.backgroundImage =
    "url(https://minesweeper.online/img/skins/hd/face_win.svg?v=2)";
  displayFlags();
  renderBombsLeft();
  clearDurationInteval();
}

function startGame(mode) {
  clearDurationInteval();
  renderGameDuration();
  renderBombsLeft();
  initBoardData(mode);
  placeBombs(mode);
  sumBombCellNeighbours();
  renderCells();
}

startGame(selectedMode);
