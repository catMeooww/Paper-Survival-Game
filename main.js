//rooms
mapSelection = "Forest";

function redirect(n) {
   if (n == 0) {
      window.location = "index.html";
   } else if (n == 1) {
      window.location = "login.html";
   }
}

function creator() {
   if (document.getElementById("RoomCreator").style.visibility == "visible") {
      document.getElementById("RoomCreator").style.visibility = "hidden";
   } else {
      document.getElementById("RoomCreator").style.visibility = "visible";
   }
}

function selectMap(m) {
   if (m == 1) {
      mapSelection = "Forest";
      document.getElementById("mapSelected").innerHTML = mapSelection;
   } else if (m == 2) {
      mapSelection = "Desert";
      document.getElementById("mapSelected").innerHTML = mapSelection;
   }
}

function newRoom() {
   if (logged) {
      roomName = document.getElementById("room-name").value;
      if (roomName != "") {
         verification = false;
         firebase.database().ref("/maps/" + roomName + "/disponible").on("value", data => {
            if (!verification) {
               verification = true
               online = data.val();
               if (online) {
                  document.getElementById("creation-error").innerHTML = "Room Already Exists";
               } else {
                  firebase.database().ref("/maps/" + roomName).set({
                     disponible: true,
                     status: "waiting",
                     host: user,
                     map: mapSelection
                  });
                  window.location = "game.html?"+roomName;
               }
            }
         });
      } else {
         document.getElementById("creation-error").innerHTML = "Set a name for Room";
      }
   } else {
      document.getElementById("creation-error").innerHTML = "You must be logged";
   }
}

//card-show
cards = [];
function loadedPage(){
   for(type of cardsAvailable){
      example = new Card(cards.length,type);
      cards.push(example);
      document.getElementById("card-carousel").innerHTML += example.element();
   }
}

function selectCard(card){
   data = cards[card].data();
   console.log(data);
   window.location = "about.html#"+data["card"];
}