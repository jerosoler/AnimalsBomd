
var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');
  
var app = require('express')()
  // creamos un web server
  , server = require('http').createServer(app)
  // y le agregamos le agregamos socketIO
  , io = require('socket.io').listen(server);
 
// ponemos en escucha nuestro server Express con WebSocket
server.listen(6969);
 
// agregamos una ruta inicial para retornar un index.html
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/game.html');
  app.use(express.static(path.join(__dirname, '/')));
});

var usernames = {};
var socketsOfClients = {};
var rooms = [];

var numroom = 0;
io.sockets.on("connection", function(message)
{
    
  message.on("newuser", function(){
    
    socketsOfClients[message.id] = { user: "player", room: "0"}
  });
  
    message.on("newroom", function(){
      numroom +=1;
      rooms.push(numroom);
      message.join(numroom);
      message.emit("numroom", numroom);
    });
    
    message.on("actualizarrooms", function(){
      var tnewrooms = {};
      for (var i = 0; i < rooms.length; i++){
	var numplayerssum = 0;
	var numplayers = io.sockets.clients(rooms[i]);
	
	for (a in numplayers){
	  numplayerssum +=1;
	}
	if(numplayerssum == 0) { rooms.splice(rooms.indexOf(rooms[i]),1);  } else {
	tnewrooms[i] = {room: rooms[i], users: numplayerssum};
	}
      }
      message.emit("rooms", tnewrooms); 
      //message.emit("rooms", rooms);
    });
    
    message.on("joinroom", function(numroom){
      message.join(numroom);
      message.emit("numroom", numroom);
      var tnewrooms = {};
      for (var i = 0; i < rooms.length; i++){
	var numplayerssum = 0;
	var numplayers = io.sockets.clients(rooms[i]);
	
	for (a in numplayers){
	  numplayerssum +=1;
	}
	
	
	tnewrooms[i] = {room: rooms[i], users: numplayerssum};
	
      }
      io.sockets.emit("rooms", tnewrooms); 
    });
    
  
    message.on("leaveroom", function(numroom){
      message.leave(numroom);
      //message.emit("numroom", "0");
      message.emit("exitroom", "0");
      io.sockets.in(numroom).emit("usuariodesconectdo", socketsOfClients[message.id].user);
      socketsOfClients[message.id].user = "player";
      socketsOfClients[message.id].room = "0";
      
     //io.sockets.in(numroom).emit("usuariodesconectdo", socketsOfClients[message.id].user);
     io.sockets.in(numroom).emit("updateusers", socketsOfClients);
      var tnewrooms = {};
      for (var i = 0; i < rooms.length; i++){
	var numplayerssum = 0;
	var numplayers = io.sockets.clients(rooms[i]);
	
	for (a in numplayers){
	  numplayerssum +=1;
	}
	
	if(numplayerssum == 0) { rooms.splice(rooms.indexOf(rooms[i]),1); } else {
	tnewrooms[i] = {room: rooms[i], users: numplayerssum};
	}
      }
      io.sockets.emit("rooms", tnewrooms); 
    });
    
    message.on("nickname",function(username){
      if(usernames[username]) {
	message.emit("ErrorNick",username); 
      } else { 
      message.username = username;
      usernames[username] = message.id;
      message.emit("nicktrue", username);
      } 
    });
    
    message.on("adduser", function(username){
    // Recorrer con un FOR SOCKETSofCLIENTS y Poner una variable para que recorra que sume uno y si es 0 nada y si es más de uno ERROR
    var userigual = 0;
    for (i in socketsOfClients){
      if(socketsOfClients[i].user == username.user && socketsOfClients[i].room == username.room) { userigual +=1; }
    }
    
    if(userigual >= 1) {
      message.emit("ErrorName",username.user);
    } else {
    //message.username = username.user;
    
    //usernames[username.user] = message.id; 
    //socketsOfClients[message.id] = username;
    socketsOfClients[message.id] = {nick: username.nick, user: username.user, okey: "false", vivo: "false", room: username.room};
    io.sockets.in(username.room).emit("updateusers", socketsOfClients);

    //io.sockets.emit("rooms", rooms); 
    
     var tnewrooms = {};
      for (var i = 0; i < rooms.length; i++){
	var numplayerssum = 0;
	var numplayers = io.sockets.clients(rooms[i]);
	
	for (a in numplayers){
	  numplayerssum +=1;
	}
	if(numplayerssum == 0) { rooms.splice(rooms.indexOf(rooms[i]),1);  } else {
	tnewrooms[i] = {room: rooms[i], users: numplayerssum};
	}
      }
      io.sockets.emit("rooms", tnewrooms); 
    
    message.emit("addplayer", username.user);
       	      }
    });
    
    message.on("usuariolisto", function(username){
      socketsOfClients[message.id].okey = "true";
      io.sockets.in(username.room).emit("updateusers", socketsOfClients);
    });
    
    message.on("playerjugando", function(username) {
      socketsOfClients[message.id].okey = "false";
      socketsOfClients[message.id].vivo = "true";
      
    });
    
    message.on("disconnect", function(){
      var roomdisconnect = socketsOfClients[message.id].room;
      io.sockets.in(socketsOfClients[message.id].room).emit("usuariodesconectdo", socketsOfClients[message.id].user);
      delete usernames[message.username];
      delete socketsOfClients[message.id];
     io.sockets.in(roomdisconnect).emit("updateusers", socketsOfClients);
     setTimeout(function(){ io.sockets.in(roomdisconnect).emit("victoria", socketsOfClients); },200);
     });
    
    message.on("position", function(data){
      io.sockets.in(data.room).emit("newposition", { usuario: data.usuario, posx: data.posx, posy: data.posy, posz: data.posz, direction: data.direction});
    });
    
    message.on("bomb", function(data){
      io.sockets.in(data.room).emit("bomba", { usuario:data.usuario, posx: data.posx, posy: data.posy, posz: data.posz });
    });
    
    message.on("muereplayer", function(data){
      //socketsOfClients[message.id].vivo = "false";
      /* for(var i = 0; i < socketsOfClients.length; i++) { 
	io.sockets.emit("alerta", i);
	if(socketsOfClients[i].user == data) { socketsOfClients[i].vivo = "false"; }
      } */
      for(i in socketsOfClients){
	if(socketsOfClients[i].user == data.user && socketsOfClients[i].room == data.room) {  socketsOfClients[i].vivo = "false"; }
      }
      //if(socketsOfClients[message.id].user == data) { socketsOfClients[message.id].vivo = "false"; } 
      io.sockets.in(data.room).emit("JugadorMuerto", data.user);
      io.sockets.in(data.room).emit("updateusers",socketsOfClients);
      setTimeout(function(){ io.sockets.in(data.room).emit("victoria", socketsOfClients); },200);
    });
    
    
    message.on("fueradetiempo", function(data){
      for(i in socketsOfClients){
	if(socketsOfClients[i].room == data) {  socketsOfClients[i].vivo = "false"; }
      }
      message.emit("updateusers",socketsOfClients);
      message.emit("victoria", socketsOfClients);
    });
    
    
    
    //CHATTT
    
    message.on("mensagechat", function(data){
       io.sockets.in(data.room).emit("newmensagechat", { nick: data.nick, message: data.mensage });
    });
    
    
    
    //FIN CHATT
    
}); 
