window.BackgroundStatus = {
    socketIoStatus: "disconnect",
    socketIoNetDelay: -1
}

// 监听tab栏插件图标点击事件, 打开控制台页面
chrome.browserAction.onClicked.addListener(() => {
    let consolePageUrl = chrome.extension.getURL("html/console.html");
    chrome.tabs.query({
        'url': consolePageUrl
    }, function (tabs) {
        console.log(tabs)
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, {
                'active': true
            });
            for (let i = 1; i < tabs.length; i++) {
                chrome.tabs.remove(tabs[i].id);
            }
        } else {
            chrome.tabs.create({
                'url': consolePageUrl,
            });
        }
    })
})

// 监听来自插件其他部分的消息
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (sender.id !== window.chrome.runtime.id) {
            return false
        }
        console.debug(message)
        switch (message.cmd) {
            case "connect2Backend":

                break;
            default:
                sendResponse("未知的指令")
        }
    }
)

// 修改直接从插件发送的所有xhr请求的请求头信息, 防止被跨域限制
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (detail) {
        let headers = detail.requestHeaders;
        if (detail.initiator === "chrome-extension://" + window.chrome.runtime.id) {
            let origin = detail.url.match(/(http(s)?:\/\/.*?)\/.*/)[1]
            headers.map((item) => {
                if (item.name === "Origin") {
                    item.value = origin;
                }
                if (item.name === "Sec-Fetch-Site") {
                    item.value = "same-origin"
                }
            })
            headers.push({
                name: "Referer",
                value: origin
            })
            console.debug(detail)
        }
        return {
            requestHeaders: headers
        }
    }, {
        urls: ["<all_urls>"]
    },
    ["blocking", "requestHeaders", "extraHeaders"],
)

function initSocketIo(id, nickname, ips) {
    let SocketCli = io(
        "ws://0.0.0.0:54321",
        {
            transport: ["websocket", "polling"],
            query: {extensionId: chrome.runtime.id, id, nickname, ips}
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

// initSocketIo("ID0001", "NickName0001", ["127.0.0.1"])

function connect2Backend() {
    let ips = [];
    let pc = new window.RTCPeerConnection({
        iceServers: [
            {url: "stun:stun3.l.google.com:19302"},
            {url: "stun:stun.services.mozilla.com"},
        ]
    })
    pc.createDataChannel('');
    pc.onicecandidate = function (e) {
        if (!e.candidate) { // Candidate gathering completed.
            pc.close();
            //
            console.log(ips)
            return;
        }
        let ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
        if (ips.indexOf(ip) === -1) // avoid duplicate entries (tcp/udp)
            ips.push(ip);
    };
    pc.createOffer().then(sdp => pc.setLocalDescription(sdp))
}

