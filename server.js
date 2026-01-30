var user = localStorage.getItem("user");
var password = localStorage.getItem("password");
var logged = false;

const firebaseConfig = {
    apiKey: "AIzaSyBUlB1mECE8i2IgQHxfk-J7mFo3VsrPkf4",
    authDomain: "craftyterraincards.firebaseapp.com",
    databaseURL: "https://craftyterraincards-default-rtdb.firebaseio.com",
    projectId: "craftyterraincards",
    storageBucket: "craftyterraincards.firebasestorage.app",
    messagingSenderId: "251593793338",
    appId: "1:251593793338:web:bd475e757bc9b294a2fa03"
};
firebase.initializeApp(firebaseConfig);

function loadUserData() {
    if (user != undefined && password != undefined) {
        var userref = firebase.database().ref("/users/" + user + "/status");
        var passref = firebase.database().ref("/users/" + user + "/password");
        var isUserCreated;
        var isJoining = false;
        userref.on("value", data => {
            isUserCreated = data.val();
            console.log("logged: " + logged);
            if (!isJoining) {
                isJoining = true;
                if (isUserCreated == "online" || isUserCreated == "mod") {
                    passref.on("value", data => {
                        canPass = data.val();
                        if (canPass == password) {
                            logged = true;
                            userLogged();
                        }else{
                          userFallback();  
                        }
                    })
                }else{
                    userFallback();
                }
            }
        });
    }else{
        userFallback();
    }
    console.log("logged: " + logged);
}

