import { Application, Graphics } from 'pixi.js';

window.onload = async () => {
    const app = new Application({
        width: 400,
        height: 400,
        backgroundColor: 0x1099bb,
    });

    await app.init();
    document.getElementById('game-field').appendChild(app.canvas);

    app.renderer.resize(400, 400);

    let gameMode = 'classic';
    let bestScore = 0;
    let currentScore = 0;

    const snake = new Snake(app);
    const food = new Food(app);
    const walls = [];
    const portals = [];

    let snakeUpdateInterval = 150;
    let lastTime = 0;
    let isGameRunning = false;

    const playButton = document.getElementById('play-button');
    const exitButton = document.getElementById('exit-button');
    const menuButton = document.getElementById('menu-button');

    document.querySelectorAll('input[name="mode"]').forEach((input) => {
        input.addEventListener('change', (e) => {
            gameMode = e.target.id;
        });
    });

    if (playButton) {
        playButton.addEventListener('click', () => {
            startGame();
        });
    }

    if (exitButton) {
        exitButton.addEventListener('click', () => {
            window.close();
        });
    }

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            stopGame();
            resetGame();
        });
    }

    function startGame() {
        playButton.style.display = 'none';
        exitButton.style.display = 'none';
        menuButton.style.display = 'block';
        isGameRunning = true;

        snake.reset();
        food.spawn();
        if (gameMode === 'portal') spawnPortals();
        currentScore = 0;
        updateScore();
        walls.length = 0;

        app.ticker.add(updateGame);
        window.addEventListener('keydown', handleKeyDown);
    }

    function stopGame() {
        isGameRunning = false;
        app.ticker.remove(updateGame);
        window.removeEventListener('keydown', handleKeyDown);
        menuButton.style.display = 'none';
        playButton.style.display = 'block';
        exitButton.style.display = 'block';
    }

    function resetGame() {
        snake.reset();
        currentScore = 0;
        updateScore();
        walls.forEach(wall => app.stage.removeChild(wall.graphics));
        walls.length = 0;
        portals.forEach(portal => app.stage.removeChild(portal.graphics));
        portals.length = 0;
    }

    function updateGame() {
        const currentTime = Date.now();
        if (currentTime - lastTime >= snakeUpdateInterval) {
            lastTime = currentTime;
            snake.update();

            if (gameMode === 'classic' && snake.isOutOfBounds()) {
                gameOver('You hit the wall!');
            }

            if (gameMode === 'classic' && snake.collidesWithSelf()) {
                gameOver('You hit yourself!');
            }

            if (gameMode === 'god-mode') {
            }

            if (gameMode === 'walls' && snake.collidesWith(food)) {
                addWall();
            }

            if (gameMode === 'portal') {
                portals.forEach((portal, index) => {
                    if (snake.collidesWith(portal)) {
                        const otherPortal = portals[1 - index];
                        snake.teleportTo(otherPortal.position);
                        spawnPortals();
                    }
                });
            }

            if (snake.collidesWith(food)) {
                snake.grow();
                food.spawn();
                currentScore += 10;
                updateScore();

                if (gameMode === 'speed') {
                    snakeUpdateInterval = Math.max(snakeUpdateInterval * 0.9, 50);
                }
            }

            if (gameMode === 'walls') {
                if (walls.some(wall => snake.collidesWith(wall))) {
                    gameOver('You hit a wall!');
                }
            }
        }
    }

    function updateScore() {
        const currentScoreElem = document.getElementById('current-score');
        const bestScoreElem = document.getElementById('best-score');

        if (currentScoreElem) {
            currentScoreElem.textContent = `Score: ${currentScore}`;
        }
        if (bestScoreElem && currentScore > bestScore) {
            bestScore = currentScore;
            bestScoreElem.textContent = `Best: ${bestScore}`;
        }
    }

    function gameOver(message) {
        alert(`Game Over! ${message}`);
        stopGame();
    }

    function handleKeyDown(e) {
        snake.changeDirection(e.key);
    }

    function addWall() {
        const wall = new Wall(app);
        wall.spawn();
        walls.push(wall);
    }

    function spawnPortals() {
        portals.forEach(portal => app.stage.removeChild(portal.graphics));
        portals.length = 0;

        for (let i = 0; i < 2; i++) {
            const portal = new Portal(app);
            portal.spawn();
            portals.push(portal);
        }
    }
};

class Snake {
    constructor(app) {
        this.app = app;
        this.size = 20;
        this.body = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
        this.direction = { x: 0, y: -1 };
        this.graphics = new Graphics();
        this.app.stage.addChild(this.graphics);
        this.gameOverState = false;
    }

    update() {
        if (this.gameOverState) return;

        const head = {
            x: this.body[0].x + this.direction.x,
            y: this.body[0].y + this.direction.y,
        };

        this.body.unshift(head);
        this.body.pop();

        this.draw();
    }

    draw() {
        this.graphics.clear();
        this.graphics.beginFill(0x00FF00);
        this.body.forEach((segment) => {
            this.graphics.drawRect(segment.x * this.size, segment.y * this.size, this.size, this.size);
        });
        this.graphics.endFill();
    }

    changeDirection(key) {
        switch (key) {
            case 'ArrowUp':
                if (this.direction.y === 0) this.direction = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (this.direction.y === 0) this.direction = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
                if (this.direction.x === 0) this.direction = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
                if (this.direction.x === 0) this.direction = { x: 1, y: 0 };
                break;
        }
    }

    teleportTo(position) {
        const head = this.body[0];
        head.x = position.x;
        head.y = position.y;
    }

    collidesWithSelf() {
        const head = this.body[0];
        return this.body.some((segment, index) => index !== 0 && segment.x === head.x && segment.y === head.y);
    }

    collidesWith(food) {
        const head = this.body[0];
        return head.x === food.position.x && head.y === food.position.y;
    }

    grow() {
        const lastSegment = this.body[this.body.length - 1];
        this.body.push({ ...lastSegment });
    }

    isOutOfBounds() {
        const head = this.body[0];
        return head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20;
    }

    reset() {
        this.body = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
        this.direction = { x: 0, y: -1 };
        this.gameOverState = false;
        this.draw();
    }
}

class Food {
    constructor(app) {
        this.app = app;
        this.size = 20;
        this.graphics = new Graphics();
        this.app.stage.addChild(this.graphics);
        this.spawn();
    }

    spawn() {
        this.position = {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20),
        };
        this.draw();
    }

    draw() {
        this.graphics.clear();
        this.graphics.beginFill(0xFF0000);
        this.graphics.drawRect(this.position.x * this.size, this.position.y * this.size, this.size, this.size);
        this.graphics.endFill();
    }
}

class Wall {
    constructor(app) {
        this.app = app;
        this.size = 20;
        this.graphics = new Graphics();
        this.app.stage.addChild(this.graphics);
    }

    spawn() {
        this.position = {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20),
        };
        this.draw();
    }

    draw() {
        this.graphics.clear();
        this.graphics.beginFill(0x000000);
        this.graphics.drawRect(this.position.x * this.size, this.position.y * this.size, this.size, this.size);
        this.graphics.endFill();
    }
}

class Portal {
    constructor(app) {
        this.app = app;
        this.size = 20;
        this.graphics = new Graphics();
        this.app.stage.addChild(this.graphics);
    }

    spawn() {
        this.position = {
            x: Math.floor(Math.random() * 20),
            y: Math.floor(Math.random() * 20),
        };
        this.draw();
    }

    draw() {
        this.graphics.clear();
        this.graphics.beginFill(0x0000FF);
        this.graphics.drawRect(this.position.x * this.size, this.position.y * this.size, this.size, this.size);
        this.graphics.endFill();
    }
}
