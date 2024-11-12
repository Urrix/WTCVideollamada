// Importa el módulo HTTP para crear un servidor HTTP.
const http = require("http");

// Importa el módulo `websocket` para manejar conexiones WebSocket.
const Socket = require("websocket").server;

// Crea un servidor HTTP básico.
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});


// Crea un servidor WebSocket utilizando el servidor HTTP existente.
const webSocket = new Socket({ httpServer: server });

// Lista para almacenar los usuarios conectados.
const users = [];

// Evento que se dispara cuando un cliente hace una solicitud de conexión WebSocket.
webSocket.on("request", (req) => {
    // Acepta la conexión entrante.
    const connection = req.accept();

    // Evento que se dispara cuando el cliente envía un mensaje.
    connection.on("message", (message) => {
        // Parsear el mensaje recibido como JSON.
        const data = JSON.parse(message.utf8Data);
        console.log(data);

        // Busca al usuario con el nombre especificado en el mensaje.
        const user = findUser(data.name);

        // Maneja diferentes tipos de mensajes según el valor de `data.type`.
        switch (data.type) {
            case "store_user":
                // Verifica si el usuario ya existe.
                if (user != null) {
                    // Si el usuario ya existe, envía una respuesta indicando que ya está registrado.
                    connection.send(JSON.stringify({
                        type: "user already exists",
                    }));
                    return;
                }

                // Si el usuario no existe, lo agrega a la lista de usuarios.
                const newUser = {
                    name: data.name,
                    conn: connection,
                };
                users.push(newUser);
                break;

            case "start_call":
                // Busca al usuario objetivo para iniciar una llamada.
                let userToCall = findUser(data.target);

                // Envía una respuesta indicando si el usuario objetivo está disponible.
                if (userToCall) {
                    connection.send(JSON.stringify({
                        type: "call_response",
                        data: "user is ready for call",
                    }));
                } else {
                    connection.send(JSON.stringify({
                        type: "call_response",
                        data: "user is not online",
                    }));
                }
                break;

            case "create_offer":
                // Busca al usuario objetivo para enviarle una oferta.
                let userToReceiveOffer = findUser(data.target);

                // Si el usuario objetivo existe, le envía la oferta.
                if (userToReceiveOffer) {
                    userToReceiveOffer.conn.send(JSON.stringify({
                        type: "offer_received",
                        name: data.name,
                        data: data.data.sdp,
                    }));
                }
                break;

            case "create_answer":
                // Busca al usuario objetivo para enviarle una respuesta.
                let userToReceiveAnswer = findUser(data.target);

                // Si el usuario objetivo existe, le envía la respuesta.
                if (userToReceiveAnswer) {
                    userToReceiveAnswer.conn.send(JSON.stringify({
                        type: "answer_received",
                        name: data.name,
                        data: data.data.sdp,
                    }));
                }
                break;

            case "ice_candidate":
                // Busca al usuario objetivo para enviarle el candidato ICE.
                let userToReceiveIceCandidate = findUser(data.target);

                // Si el usuario objetivo existe, le envía el candidato ICE.
                if (userToReceiveIceCandidate) {
                    userToReceiveIceCandidate.conn.send(JSON.stringify({
                        type: "ice_candidate",
                        name: data.name,
                        data: {
                            sdpMLineIndex: data.data.sdpMLineIndex,
                            sdpMid: data.data.sdpMid,
                            sdpCandidate: data.data.sdpCandidate,
                        },
                    }));
                }
                break;
        }
    });

    // Evento que se dispara cuando un cliente cierra la conexión.
    connection.on("close", () => {
        // Elimina al usuario desconectado de la lista de usuarios.
        users.forEach((user) => {
            if (user.conn === connection) {
                users.splice(users.indexOf(user), 1);
            }
        });
    });
});

// Función para buscar un usuario por su nombre.
const findUser = (username) => {
    for (let i = 0; i < users.length; i++) {
        if (users[i].name === username) return users[i];
    }
};
