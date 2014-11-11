//Ports
var websocket_port = 3001;
var tcp_port = 3002;

//Eigene IP
var ip_address = "10.2.1.233";

//Sockets erstellen
websocket(websocket_port);
tcp_server(tcp_port);

//Benötigte Variabeln zur Verwaltung der Websocket Verbindungen
var websocket_connections = {};
var websocket_id_counter = 0;

//WebSocket
function websocket(port){
	var http = require('http');
	var httpserver = http.createServer(function(request, response) {});
	httpserver.listen(port, function() {
		console.log((new Date()) + ' WebSocket is listening on Port '+port);
	});

	var websocketServer = require('websocket').server;
	var websocket = new websocketServer({
		httpServer: httpserver
	});
	
	websocket.on('request', function(request) {
		//console.log(request);
		if (!originIsAllowed(request.origin)) {
			// Make sure we only accept requests from an allowed origin
			request.reject();
			console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
			return;
		}
		var connection = connection = request.accept(null, request.origin)
			console.log((new Date()) + ' New Client Connection IP:' + connection.remoteAddress );

			//Die Verbindung mit einer ID versehen, um sie später identifizieren zu können
			connection.id = websocket_id_counter++

			//Speichern der Verbindung
			websocket_connections[connection.id] = connection;

			//Event Listener für eingende Nachrichten
			connection.on('message', function(data) {
				if(IsJson(data.utf8Data)){
					console.log("OK LETS GO");
					data_handling_from_client(JSON.parse(data.utf8Data),connection.id);
				}
				else{
					if(data.utf8Data == "init"){
						console.log("python init_call.py " + connection.id);
						var sys = require('sys')
						var exec = require('child_process').exec;
						function puts(error, stdout, stderr) { sys.puts(stdout) }
						exec("python init_call.py " + connection.id, puts);
						console.log("python init_call.py " + connection.id);
					}
					else{
						console.log("return to CLient");
						console.log(data.utf8Data);
						connection.sendUTF(data.utf8Data);
					}
				}
			});

			//Event Listener, wenn die Verbindung unterbrochen wird
			connection.on('close', function(reasonCode, description) {
				console.log((new Date()) + ' Clinet Connection Closed IP: ' + connection.remoteAddress + ' disconnected.');

				//Löschen der Verbindung
				delete websocket_connections[connection.id];
			});
		
	});

}

function tcp_server(port){
	//TCP Server Init
        console.log("new TCP Server");
	var net = require('net');
	var server = net.createServer(function(socket) { //'connection' listener
		
		socket.on('end', function() {
			console.log(port + ' server disconnected');
		});
		socket.on('data', function (data) {
			//Data Handling
			console.log("#############################################");
			data_handling_from_server(data);
			/*if(IsJson(data))
				data_handling_from_server(data)
			else
				console.log("Kein JSON");*/
			
			//console.log(data.toString());
		});
		socket.on('error', function(err){
			console.log("Error: "+err.message);
		});
	}).listen(port, function() { //'listening' listener
	  console.log(port + ' server bound');
	});
}

//UDP Server
function udp_server(port){
	var dgram = require('dgram');
	var server = dgram.createSocket('udp4');
	server.bind(port, "0.0.0.0");
	server.on('listening', function () {

	});
	server.on('message', function (data, remote) {
		//Data Handling
		console.log("Incoming UDP MEssage");
		data_handling_from_server(data)
	});
	server.on('error', function(err){
		console.log("Error: "+err.message);
	});
}

//Data Handling
function data_handling_from_server(data){
	console.log("data from server#");
	console.log("Data: "+ data);
	data = JSON.parse(data);
	if(data.destination){
		console.log("Send data to: "+data.destination);
		console.log(data.data)
		if(data.destination == "all")
			SendDataToClients(JSON.stringify(data.data));
		else
			SendDataToClient(data.destination,JSON.stringify(data.data))
	}
	else if(data.data){
		SendDataToClients(JSON.stringify(data.data));
	}
	
}

function data_handling_from_client(inputdata,connection_id){

	var destination_ip = inputdata.address;
	var destination_port = inputdata.port;
	var data = inputdata.data;
	
	var senddata = {};
	senddata.data = data;
	senddata.source = connection_id
	senddata.address = ip_address;
	senddata.port = tcp_port;
	
	console.log(JSON.stringify(senddata))
	
	send_tcp(destination_ip,destination_port,JSON.stringify(senddata));
}

//Send TCP
function send_tcp(ip,port,data){
	console.log("send tcp to "+ip+":"+port);
	var net = require('net');
 
	var socket = net.createConnection(port,ip,function(){
		socket.end(data);
	});
	
	socket.on('error', function(err){
		console.log("Error: "+err.message);
	});
	
}


//Send Data to Client
function SendDataToClients(message){
    for(var i in websocket_connections){
        websocket_connections[i].sendUTF(message);
    }
}

function SendDataToClient(clientid,message){
    for(var i in websocket_connections){
        if(websocket_connections[i].id == clientid){
            websocket_connections[i].sendUTF(message);
        }
    }
}

//Sonstige Funktionen
function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

function IsJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}