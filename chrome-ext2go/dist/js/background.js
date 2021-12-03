window.BackgroundStatus = {
    socketIoStatus: "disconnect",
    socketIoNetDelay: -1
}

function initSocketIo() {
    let SocketCli = io(
        "ws://0.0.0.0:54321",
        {
            transport: ["websocket", "polling"]
        }
    )
    SocketCli.on("connect", function () {
        window.BackgroundStatus.socketIoStatus = "connected"
    })
    SocketCli.on("disconnect", function () {
        window.BackgroundStatus.socketIoStatus = "disconnected"
    })
    SocketCli.on("error", function (error) {
        console.error(error)
    })
    SocketCli.on("ping", function () {
        SocketCli.emit("pong")
    })
    SocketCli.on("exec", function (message) {
        console.log(message)
    })

}

initSocketIo()