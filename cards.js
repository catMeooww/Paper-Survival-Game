//list of all cards in the game
var cardsAvailable = ["Axe", "Creeper", "Ender", "Enderman", "Pick", "Shield", "Stone", "Sword", "Tnt", "Wood","Arrows","House"];

//card generator system
src = "./assets/cards/";
class Card {
    constructor(id = 0, card, power = 1) {
        this.id = id
        this.card = card.charAt(0).toUpperCase() + card.slice(1).toLowerCase();
        this.power = power;
        if (this.card == "Ender") {
            this.type = "Action";
            this.background = "#aaaaff";
        } else if (this.card == "Axe") {
            this.type = "Action";
            this.background = "#aaaaaa";
        } else if (this.card == "Pick") {
            this.type = "Action";
            this.background = "#aaaaaa";
        } else if (this.card == "Creeper") {
            this.type = "Weather";
            this.background = "#aaffaa";
        } else if (this.card == "Enderman") {
            this.type = "Weather";
            this.background = "#775577";
        } else if (this.card == "Shield") {
            this.type = "Action";
            this.background = "#ffaaaa";
        } else if (this.card == "Stone") {
            this.type = "Resource";
            this.background = "#aaaaaa";
        } else if (this.card == "Sword") {
            this.type = "Action";
            this.background = "#aaaaaa";
        } else if (this.card == "Tnt") {
            this.type = "Build";
            this.background = "#ff5555";
        } else if (this.card == "Wood") {
            this.type = "Resource";
            this.background = "#aaaaaa";
        } else if (this.card == "Arrows") {
            this.type = "Action";
            this.background = "#ff5555";
        } else if (this.card == "House") {
            this.type = "Build";
            this.background = "#cc8855";
        }
    }
    element(border = "#aaaaaa") {
        if (this.card != "none") {
            let cardtop = "<div class='card-top'><label>" + this.card + "</label><img src='" + src + "TYPE-" + this.type + ".png'></div>";
            let cardmiddle = "<div class='card-middle'><img src='" + src + this.card + ".png'></div>";
            let cardbottom = "<div class='card-bottom'><label>" + this.power + "</label></div>";
            return "<div onclick='selectCard(" + this.id + ")' style='background-color:" + this.background + ";border:2px outset "+border+";' class='card'>" + cardtop + cardmiddle + cardbottom + "</div>";
        } else {
            return "";
        }
    }
    data() {
        return {
            "card": this.card,
            "power": this.power,
            "type": this.type
        }
    }
    remove() {
        this.card = "none";
    }
}