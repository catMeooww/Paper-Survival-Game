//load system
loadUserData();
userMobile = /iPhone|Android|iPad/i.test(navigator.userAgent);

gameLoaded = false;

url = window.location.href;
url = url.split("?");
roomName = url[1];
gameWidth = window.innerWidth;
gameHeight = window.innerHeight;

selectedMap = "";
mapData = "";
isHost = false;
mapReady = false;

canPlace = false;
interacting = false;
usingCard = false;
gridX = 0;
gridY = 0;

playersPosX = [];
playersPosY = [];

playerCards = [];
selectedCard = [NaN, "none", null, null];

function userOff() {
    if (gameLoaded) {
        firebase.database().ref("/maps/" + roomName + "/players/" + user).update({
            online: false
        });
    }
    window.location = "/";
}

window.addEventListener('beforeunload', (event) => {
    userOff();
});

function userLogged() {
    if (roomName != "") {
        verification = false;
        firebase.database().ref("/maps/" + roomName + "/disponible").on("value", data => {
            if (!verification) {
                verification = true
                online = data.val();
                if (online) {
                    gameLoaded = true;
                    firebase.database().ref("/maps/" + roomName + "/players/" + user).update({
                        online: true
                    });
                } else {
                    window.location = "index.html";
                }
            }
        });
    } else {
        window.location = "index.html";
    }
}

//load initial data
function loadMapData() {
    document.getElementById("login").innerHTML = 'Logged as ' + user;
    document.getElementById("roomname").innerHTML = roomName;
    //map data
    firebase.database().ref("/maps/" + roomName + "/map").on("value", data => {
        selectedMap = data.val();
        fetch('./assets/worlds/' + selectedMap + ".json")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                mapData = data;
            })
            .catch(error => {
                console.error('Error loading Map File: ' + error);
            });
        document.getElementById("roommap").innerHTML = "Map: " + selectedMap;
    });
    //verify host
    firebase.database().ref("/maps/" + roomName + "/host").on("value", data => {
        if (user == data.val()) {
            isHost = true;
            document.getElementById("startButton").style.visibility = "visible";
        }
    });
    //load players
    firebase.database().ref("/maps/" + roomName + "/players").on('value', function (snapshot) {
        document.getElementById("roomplayers").innerHTML = "<b>Players</b>: <br>";
        totalPlayers = 0;
        snapshot.forEach(function (childSnapshot) {
            childKey = childSnapshot.key; childData = childSnapshot.val();
            document.getElementById("roomplayers").innerHTML += "-" + childKey + "<br>";
            totalPlayers += 1
            if (totalPlayers > 3) {
                firebase.database().ref("/maps/" + roomName).update({
                    disponible: false
                });
            }
        });
    });
    //verify game status
    firebase.database().ref("/maps/" + roomName + "/status").on("value", data => {
        ready = data.val();
        if (ready == "playing") {
            if (!mapReady) {
                for (i = 0; i < 3; i++) {
                    card = getRandomCard(playerCards);
                    playerCards.push(card);
                }
            }
            mapReady = true;
            document.getElementById("lobby").style.visibility = "hidden";
            document.getElementById("startButton").style.visibility = "hidden";
        }
    });
}

function getLocalBiome(x, y) {
    for (biome of mapData["biomes"]) {
        for (pos of biome["pos"]) {
            startX = pos[0][0] - 1;
            finalX = pos[1][0] - 1;
            startY = pos[0][1] - 1;
            finalY = pos[1][1] - 1;
            if ((x >= startX && x <= finalX) && (y >= startY && y <= finalY)) {
                return biome["type"];
            }
        }
    }
    return mapData["default"];
}

//start map
resources = [];

function isOcupped(x, y) {
    for (resource of resources) {
        if (resource["x"] == x && resource["y"] == y) {
            return true;
        }
    }
    return false;
}

function genTrees(probability) {
    trees = [];
    for (y = 0; y < mapData["size"][1]; y++) {
        for (x = 0; x < mapData["size"][0]; x++) {
            if (Math.random() * 300 < probability && !isOcupped(x, y)) {
                biome = getLocalBiome(x, y);
                if (biome == "forest") {
                    trees.push({ 'x': x, 'y': y, 'type': 'tree' });
                } else if (biome == "taiga") {
                    trees.push({ 'x': x, 'y': y, 'type': 'pinetree' });
                } else if (biome == "jungle") {
                    trees.push({ 'x': x, 'y': y, 'type': 'hugetree' });
                }
            }
        }
    }
    return trees;
}

function genStones(probability) {
    stones = [];
    for (y = 0; y < mapData["size"][1]; y++) {
        for (x = 0; x < mapData["size"][0]; x++) {
            if (Math.random() * 300 < probability && !isOcupped(x, y)) {
                biome = getLocalBiome(x, y);
                if (biome != "water") {
                    stones.push({ 'x': x, 'y': y, 'type': 'stone' });
                }
            }
        }
    }
    return stones;
}

function genInteractors(probability) {
    interectors = [];
    types = ["chest", "villager"];
    for (y = 0; y < mapData["size"][1]; y++) {
        for (x = 0; x < mapData["size"][0]; x++) {
            if (Math.random() * 300 < probability && !isOcupped(x, y)) {
                biome = getLocalBiome(x, y);
                selected = types[Math.floor(Math.random() * types.length)];
                if (biome != "water") {
                    interectors.push({ 'x': x, 'y': y, 'type': selected });
                }
            }
        }
    }
    return interectors;
}

isGenerating = false;
function generateMap() {
    if (!isGenerating) {
        isGenerating = true;
        document.getElementById("startButton").innerHTML = "GENERATING...";
        positioned = false;
        //players
        firebase.database().ref("/maps/" + roomName + "/players").on('value', function (snapshot) {
            if (!positioned) {
                positioned = true;
                totalPlayers = 0;
                snapshot.forEach(function (childSnapshot) {
                    childKey = childSnapshot.key; childData = childSnapshot.val();
                    resources.push({
                        'x': mapData["SpawnPos"][totalPlayers][0],
                        'y': mapData["SpawnPos"][totalPlayers][1],
                        'type': 'craft',
                        'own': childKey
                    })
                    firebase.database().ref("/maps/" + roomName + "/players/" + childKey).update({
                        x: mapData["SpawnPos"][totalPlayers][0] * 50,
                        y: mapData["SpawnPos"][totalPlayers][1] * 50,
                        points: 20
                    });
                    totalPlayers += 1
                });
            }
        });
        //resources
        resources = resources.concat(genStones(25));
        resources = resources.concat(genTrees(35));
        resources = resources.concat(genInteractors(5));
        firebase.database().ref("/maps/" + roomName).update({
            elements: resources
        });

        //play
        firebase.database().ref("/maps/" + roomName).update({
            status: "playing",
            turn: user
        });
    }
}

//not logged yet );
function userFallback() {
    window.location = "login.html";
}

//game
function getRandomCard(listed) {
    randcard = Math.floor(Math.random() * cardsAvailable.length);
    return new Card(listed.length, cardsAvailable[randcard]);
}

function preload() {
    playerImg = loadImage("./assets/map/ExplorerPlayer.png");
    treeAsset = loadImage("./assets/map/Tree.png");
    pinetreeAsset = loadImage("./assets/map/PineTree.png");
    hugetreeAsset = loadImage("./assets/map/JungleTree.png");
    stoneAsset = loadImage("./assets/map/Stone.png");
    crafttableAsset = loadImage("./assets/map/CraftTable.png");
    chestAsset = loadImage("./assets/map/Chest.png");
    villagerAsset = loadImage("./assets/map/Villager.png");
}

function setup() {
    canvas = createCanvas(gameWidth, gameHeight - 33);
    canvas.parent("canvas-holder");
}

offsetX = 0;
offsetY = 0;

lowUpdates = 0;

function draw() {
    try {
        frameRate(100);
        if (mapReady) {
            //draw map
            background("gray");
            stroke("black");
            strokeWeight(1);
            if (mapData["default"] == "forest") {
                fill("rgb(7, 167, 7)");
                rect(0, 0, 50 * mapData["size"][0], 50 * mapData["size"][1]);
            }
            for (biome of mapData["biomes"]) {
                strokeWeight(0);
                for (position of biome["pos"]) {
                    if (biome["type"] == "forest") {
                        fill("rgb(7, 167, 7)");
                        rect(position[0][0] * 50 - 50, position[0][1] * 50 - 50, (position[1][0] * 50) - (position[0][0] * 50 - 50), (position[1][1] * 50) - (position[0][1] * 50 - 50));
                    } else if (biome["type"] == "taiga") {
                        fill("rgb(250,250,250)");
                        rect(position[0][0] * 50 - 50, position[0][1] * 50 - 50, (position[1][0] * 50) - (position[0][0] * 50 - 50), (position[1][1] * 50) - (position[0][1] * 50 - 50));
                    } else if (biome["type"] == "jungle") {
                        fill("rgb(5, 107, 5)");
                        rect(position[0][0] * 50 - 50, position[0][1] * 50 - 50, (position[1][0] * 50) - (position[0][0] * 50 - 50), (position[1][1] * 50) - (position[0][1] * 50 - 50));
                    } else if (biome["type"] == "desert") {
                        fill("rgb(250, 250, 5)");
                        rect(position[0][0] * 50 - 50, position[0][1] * 50 - 50, (position[1][0] * 50) - (position[0][0] * 50 - 50), (position[1][1] * 50) - (position[0][1] * 50 - 50));
                    } else if (biome["type"] == "water") {
                        fill("rgb(5, 152, 250)");
                        rect(position[0][0] * 50 - 50, position[0][1] * 50 - 50, (position[1][0] * 50) - (position[0][0] * 50 - 50), (position[1][1] * 50) - (position[0][1] * 50 - 50));
                    }
                }
            }
            //map resources
            resourcesDrew = false;
            hovering = "none";
            firebase.database().ref("/maps/" + roomName + "/elements").on('value', function (snapshot) {
                if (!resourcesDrew) {
                    resourcesDrew = true;
                    snapshot.forEach(function (childSnapshot) {
                        childKey = childSnapshot.key; childData = childSnapshot.val();
                        resourceX = childData['x'] * 50;
                        resourceY = childData['y'] * 50;
                        resourceType = childData['type']
                        gridX = Math.floor((mouseX + (camera.x - gameWidth / 2)) / 50) * 50;
                        gridY = Math.floor((mouseY + (camera.y + 20 - gameHeight / 2)) / 50) * 50;
                        if (gridX == resourceX && gridY == resourceY) {
                            hovering = [childKey, resourceType, childData];
                        }
                        //draw resource
                        if (resourceType == "tree") {
                            image(treeAsset, resourceX, resourceY, 50, 50);
                        } else if (resourceType == "pinetree") {
                            image(pinetreeAsset, resourceX, resourceY, 50, 50);
                        } else if (resourceType == "hugetree") {
                            image(hugetreeAsset, resourceX, resourceY, 50, 50);
                        } else if (resourceType == "stone") {
                            image(stoneAsset, resourceX, resourceY, 50, 50);
                        } else if (resourceType == "craft") {
                            image(crafttableAsset, resourceX, resourceY, 50, 50);
                        } else if (resourceType == "chest") {
                            image(chestAsset, resourceX, resourceY, 50, 50);
                        } else if (resourceType == "villager") {
                            image(villagerAsset, resourceX, resourceY, 50, 50);
                        }
                    });
                }
            });
            //draw players
            playerDrew = false;
            firebase.database().ref("/maps/" + roomName + "/players").on('value', function (snapshot) {
                if (!playerDrew) {
                    playerDrew = true;
                    playerCount = 0;
                    playerList = [];
                    playersPosX = [];
                    playersPosY = [];
                    snapshot.forEach(function (childSnapshot) {
                        childKey = childSnapshot.key; childData = childSnapshot.val();
                        nplayerX = childData['x'];
                        nplayerY = childData['y'];
                        playerOnline = childData['online'];
                        playerScore = childData['points'];
                        if (playerScore > 0) {
                            playerCount += 1;
                            if (playerOnline) {
                                playerList.push(childKey);
                                playersPosX.push(nplayerX);
                                playersPosY.push(nplayerY);
                                image(playerImg, nplayerX, nplayerY, 50, 50);
                                if (childKey == user) {
                                    playerX = nplayerX;
                                    playerY = nplayerY;
                                    camera.x = playerX + offsetX;
                                    camera.y = playerY + offsetY;
                                    document.getElementById("player-score").innerHTML = playerScore;
                                    if (playerScore >= 15) {
                                        document.getElementById("player-score").style.backgroundColor = "lime";
                                    } else if (playerScore <= 5) {
                                        document.getElementById("player-score").style.backgroundColor = "red";
                                    } else {
                                        document.getElementById("player-score").style.backgroundColor = "orange";
                                    }
                                } else {
                                    strokeWeight(1);
                                    fill("white");
                                    text(childKey, nplayerX - 5, nplayerY - 10);
                                }
                            }
                        }else if(childKey == user){
                            mapReady = false;
                            document.getElementById("endResultData").innerHTML = "You ran out of points";
                            document.getElementById("lobby").style.visibility = "visible";
                        }
                    });
                    document.getElementById("player-count").innerHTML = "Players: " + playerCount;
                    if(playerCount == 1){
                        mapReady = false;
                        document.getElementById("endResultData").innerHTML = playerList[0] + " is the Winner";
                        document.getElementById("lobby").style.visibility = "visible";
                        document.getElementById("startButton").innerHTML = "<button onclick='restartGame()' style='background-color: greenyellow;border: 2px green outset;color:blue;width: 60%;'>Restart Game</button>";
                        document.getElementById("startButton").style.visibility = "visible";
                    }
                }
            });
            //playing
            firebase.database().ref("/maps/" + roomName + "/turn").on("value", data => {
                if (mouseX < 50 || mouseX > gameWidth - 50 || mouseY < 100 || mouseY > gameHeight - 200) {
                    fill("rgba(0,0,0,0)");
                    stroke("orange");
                    strokeWeight(2);
                    rect((camera.x - gameWidth / 2) + 50, (camera.y + 20 - gameHeight / 2) + 100, gameWidth - 100, gameHeight - 300);
                } else {
                    turn = data.val();
                    if (turn == user) {
                        stroke("white");
                        strokeWeight(1);
                        gridX = Math.floor((mouseX + (camera.x - gameWidth / 2)) / 50) * 50;
                        gridY = Math.floor((mouseY + (camera.y + 20 - gameHeight / 2)) / 50) * 50;
                        distX = Math.abs(playerX - gridX);
                        distY = Math.abs(playerY - gridY);
                        if (!(playersPosX.includes(gridX) && playersPosY.includes(gridY)) && (gridX >= 0 && gridX < 50 * mapData["size"][0] && gridY >= 0 && gridY < 50 * mapData["size"][1])) {
                            if (selectedCard[1] == "Ender") {
                                usingCard = true;
                                interacting = false;
                                if (
                                    distX <= 50 * (selectedCard[2] + 2) && distY <= 50 * (selectedCard[2] + 2)
                                    && (hovering == "none" || hovering[1] == "craft")
                                    && getLocalBiome(gridX / 50, gridY / 50) != "water"
                                ) {
                                    canPlace = true;
                                } else {
                                    canPlace = false;
                                }
                            } else if (selectedCard[1] == "Axe") {
                                usingCard = true;
                                interacting = false;
                                if (
                                    distX <= 50 * 3 && distY <= 50 * 3
                                    && (hovering[1] == "tree" || hovering[1] == "pinetree" || hovering[1] == "hugetree")
                                ) {
                                    canPlace = true;
                                } else {
                                    canPlace = false;
                                }
                            } else if (selectedCard[1] == "Pick") {
                                usingCard = true;
                                interacting = false;
                                if (
                                    distX <= 50 * 3 && distY <= 50 * 3
                                    && (hovering[1] == "stone")
                                ) {
                                    canPlace = true;
                                } else {
                                    canPlace = false;
                                }
                            } else if (selectedCard[1] == "Sword") {
                                usingCard = true;
                                interacting = false;
                                if (
                                    distX <= 50 * (selectedCard[2] + 2) && distY <= 50 * (selectedCard[2] + 2)
                                ) {
                                    if (hovering == "none") {
                                        canPlace = true;
                                    } else if ((hovering[1] == "craft" && hovering[2]['own'] != user)) {
                                        canPlace = true;
                                        interacting = hovering;
                                    } else {
                                        canPlace = false;
                                    }
                                } else {
                                    canPlace = false;
                                }
                            } else {
                                usingCard = false;
                                if (
                                    distX <= 50 && distY <= 50
                                    && (hovering == "none" || hovering[1] == "craft")
                                    && getLocalBiome(gridX / 50, gridY / 50) != "water"
                                ) {
                                    canPlace = true;
                                    interacting = false;
                                } else if (distX <= 50 && distY <= 50
                                    && (hovering[1] == "chest" || hovering[1] == "villager")) {
                                    canPlace = false;
                                    interacting = hovering;
                                } else {
                                    canPlace = false;
                                    interacting = false;
                                }
                            }
                        } else {
                            canPlace = false;
                            interacting = false;
                        }

                        if (canPlace) {
                            fill("rgba(0,255,0,0.6)");
                        } else if (interacting) {
                            fill("rgba(0,0,255,0.6)");
                        } else {
                            fill("rgba(255,0,0,0.6)");
                        }

                        rect(gridX, gridY, 50, 50);
                    } else {
                        canPlace = false;
                        interacting = false;
                    }
                }
            });
        }
        if (lowUpdates >= 15) {
            //get latest sizes
            previousGameWidth = gameWidth;
            previousGameHeight = gameHeight;
            gameWidth = window.innerWidth;
            gameHeight = window.innerHeight;
            if (gameWidth != previousGameWidth || gameHeight != previousGameHeight) {
                console.debug("Change Game Window Size");
                resizeCanvas(gameWidth, gameHeight - 33)
            }
            //list cards
            document.getElementById("card-carousel").innerHTML = "<div id='uncard' onclick='unselectCard()'><p>Unselect</p><button style='background-color:gray;border-radius:20px;color: darkslategray;'>-</button></div>";
            lc = 0;
            for (card of playerCards) {
                cardelement = card.element();
                if (selectedCard[0] == lc) {
                    cardelement = card.element("#00ff00");
                }
                document.getElementById("card-carousel").innerHTML += cardelement;
                lc = lc + 1
            }

            lowUpdates = 0;
        } else {
            lowUpdates += 1
        }
    } catch (error) {
        console.warn("Frame Update Error: " + error);
    }
}

//interactions
function moveScreen() {
    if (mouseX < 50) {
        offsetX -= 50;
    }
    if (mouseX > gameWidth - 50) {
        offsetX += 50;
    }

    if (mouseY < 100 && !(mouseY < 50)) {
        offsetY -= 50;
    }
    if (mouseY > gameHeight - 200 && !(mouseY > gameHeight - 150)) {
        offsetY += 50;
    }
}

function mouseClicked() {
    if (mouseX < 50 || mouseX > gameWidth - 50 || mouseY < 100 || mouseY > gameHeight - 250) {
        moveScreen();
    }
    else if (canPlace) {
        if (selectedCard[1] == "Axe") {
            firebase.database().ref("/maps/" + roomName + "/elements").once('value', function (snapshot) {
                snapshot.forEach(function (childSnapshot) {
                    childKey = childSnapshot.key; childData = childSnapshot.val();
                    resourceX = childData['x'] * 50;
                    resourceY = childData['y'] * 50;
                    resourceType = childData['type'];
                    if (resourceType == "tree" || resourceType == "pinetree" || resourceType == "hugetree") {
                        if (Math.abs(resourceX - gridX) <= 50 * (selectedCard[2] + 2) && Math.abs(resourceY - gridY) <= 50 * (selectedCard[2] + 2)) {
                            playerCards.push(new Card(playerCards.length, "Wood", selectedCard[2]))
                            firebase.database().ref("/maps/" + roomName + "/elements").update({ [childKey]: null })
                        }
                    }
                });
            });
        } else if (selectedCard[1] == "Pick") {
            firebase.database().ref("/maps/" + roomName + "/elements").once('value', function (snapshot) {
                snapshot.forEach(function (childSnapshot) {
                    childKey = childSnapshot.key; childData = childSnapshot.val();
                    resourceX = childData['x'] * 50;
                    resourceY = childData['y'] * 50;
                    resourceType = childData['type'];
                    if (resourceType == "stone") {
                        if (Math.abs(resourceX - gridX) <= 50 * (selectedCard[2] + 2) && Math.abs(resourceY - gridY) <= 50 * (selectedCard[2] + 2)) {
                            playerCards.push(new Card(playerCards.length, "Stone", selectedCard[2]))
                            firebase.database().ref("/maps/" + roomName + "/elements").update({ [childKey]: null })
                        }
                    }
                });
            });
        } else if (selectedCard[1] == "Sword") {
            if (!interacting) {
                firebase.database().ref("/maps/" + roomName + "/players").once('value', function (snapshot) {
                    snapshot.forEach(function (childSnapshot) {
                        childKey = childSnapshot.key; childData = childSnapshot.val();
                        targetX = childData['x'];
                        targetY = childData['y'];
                        targetScore = childData['points']
                        targetName = childKey;
                        if (targetName != user) {
                            if (Math.abs(targetX - gridX) <= 50 * (selectedCard[2] + 2) && Math.abs(targetY - gridY) <= 50 * (selectedCard[2] + 2)) {
                                firebase.database().ref("/maps/" + roomName + "/players/" + targetName).update({ points: targetScore - selectedCard[2] });
                            }
                        }
                    });
                });
            } else {
                firebase.database().ref("/maps/" + roomName + "/players/" + interacting[2]['own'] + "/points").once('value', data => {
                    targetScore = data.val()
                    firebase.database().ref("/maps/" + roomName + "/players/" + interacting[2]['own']).update({
                        points: targetScore - selectedCard[2]
                    })
                })
                firebase.database().ref("/maps/" + roomName + "/elements/").update({
                    [interacting[0]]: null
                });
            }
        } else {
            firebase.database().ref("/maps/" + roomName + "/players/" + user).update({
                x: gridX,
                y: gridY
            });
        }
        nextTurn = playerList.indexOf(user) + 1;
        if (playerList[nextTurn] == undefined) {
            nextTurn = 0;
        }
        firebase.database().ref("/maps/" + roomName).update({
            turn: playerList[nextTurn]
        });
        if (usingCard) {
            playerCards[selectedCard[0]].remove();
            unselectCard();
        }
    } else if (interacting) {
        if (interacting[1] == "chest") {
            firebase.database().ref("/maps/" + roomName + "/elements").update({
                [interacting[0]]: null
            });
            generatingLoot = Math.floor(Math.random() * 3) + 1;
            for (i = 0; i < generatingLoot; i++) {
                card = getRandomCard(playerCards);
                playerCards.push(card);
            }
        }
    }
}

function selectCard(cardid) {
    carddata = playerCards[cardid].data();
    selectedCard = [cardid, carddata['card'], carddata['power'], carddata['type']];
    document.getElementById("card-data").innerHTML = "<h3>Card: " + selectedCard[1] + "</h3>";
    document.getElementById("card-data").innerHTML += "<ul><li>Power: " + selectedCard[2] + "</li><li>Type: " + selectedCard[3] + "</li><li>N°: " + (selectedCard[0] + 1) + "</li></ul>"
}

function unselectCard() {
    selectedCard = [NaN, "none", null, null];
    document.getElementById("card-data").innerHTML = "<h3>No Card Selected</h3>";
}

function camCenter() {
    offsetX = 0;
    offsetY = 0;
}

function restartGame(){
    firebase.database().ref("/maps/" + roomName).update({
        status: "waiting",
    });
    location.reload();
}