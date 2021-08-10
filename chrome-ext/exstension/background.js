// 常驻后台进程

/*
* 1.插件加载则尝试与后台服务简历SocketIo连接, 监听来自后台服务的任务数据
* 2.监听Tab的消息与关闭事件，并作做出相应的处理
*/

// https://developer.chrome.com/docs/extensions/reference/runtime/#property-id 
var myExstensionId = chrome.runtime.id;
console.log("My Exstension Id is", myExstensionId);
// const BackendSrvAddr = 'ws://nowkin.com:43999';
const BackendSrvAddr = 'ws://10.0.0.23:45321';
// 自动创建工作tab的数量上限，即当已存在的工作tab数量超过此数值时，不在允许background自己创建新的工作tab
const AutoCreateWorkerTabLimit = 10;
/*
WorkerTabs: map[string]=boolean
保存工作tab的ID字符串和繁忙状态布尔值
*/
var WorkerTabs = {};
var UsableTabs = [];
var ExtUniqueID = localStorage.getItem("ExtUniqueID");
var ExtTypeName = localStorage.getItem("ExtTypeName");
var ExtNickName = localStorage.getItem("ExtNickName");
var OnlineOk = false;
var FlushWorkerTabsClock = null;
//
SocketIoCli = io(BackendSrvAddr, {
    autoConnect: true,
    transports: ["websocket", "polling"],
});

SocketIoCli.on("connect", function () {
    console.debug("SocketIoConnected")
    ClientOnline();
})

SocketIoCli.on("ping", function () {
    SocketIoCli.emit("pong")
})

SocketIoCli.on("online_ok", function (params) {
    OnlineOk = true
    console.debug("OnlineOk:" + OnlineOk)
    if (!FlushWorkerTabsClock) {
        FlushWorkerTabsClock = setInterval(FlushWorkerTabs, 1000)
    }
    chrome.runtime.sendMessage(
        chrome.runtime.id,
        {
            recipient: "options",
            cmd: "errmsg",
            params: { errmsg: "连接服务器成功！" }
        },
        function (resp) {

        }
    )

})

SocketIoCli.on("online_fail", function (params) {
    clearInterval(FlushWorkerTabsClock);
    FlushWorkerTabsClock = null;
    OnlineOk = false
    console.debug("OnlineOk:" + OnlineOk)
    //
    chrome.runtime.openOptionsPage();
    setTimeout(function () {
        chrome.runtime.sendMessage(
            chrome.runtime.id,
            {
                recipient: "options",
                cmd: "errmsg",
                params: params
            },
            function (resp) {

            }
        )
    }, 500)
})

SocketIoCli.on("disconnect", function () {
    clearInterval(FlushWorkerTabsClock);
    FlushWorkerTabsClock = null;
    OnlineOk = false
    console.debug("OnlineOk:" + OnlineOk)
})

SocketIoCli.on("task_exec", function (task) {
    try {
        DispatchTask(task)
    } catch (error) {
        task.exec_error = error.toString()
        TaskCallback(task);
    }

})


function ShowProfile() {
    console.info("ExtUiqueID: ", ExtUniqueID);
    console.info("ExtTypeName: ", ExtTypeName);
    console.info("ExtNickName: ", ExtNickName);
    console.info("OnlineOk: ", OnlineOk);
    console.info("WorkerTabs: ", WorkerTabs);
    console.info("UsableTabs: ", UsableTabs);

}

function GetMyIPs(callback) {
    var ips = [];
    var RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var pc = new RTCPeerConnection({
        iceServers: [
            {
                url: 'stun:stun3.l.google.com:19302'
            },
            {
                url: 'stun:stun.services.mozilla.com'
            },
        ]
    });
    // Add a media line, this is needed to activate candidate gathering.
    pc.createDataChannel('');
    // onicecandidate is triggered whenever a candidate has been found.
    pc.onicecandidate = function (e) {
        if (!e.candidate) { // Candidate gathering completed.
            pc.close();
            callback(ips);
            return;
        }
        var ip = /^candidate:.+ (\S+) \d+ typ/.exec(e.candidate.candidate)[1];
        if (ips.indexOf(ip) == -1) // avoid duplicate entries (tcp/udp)
            ips.push(ip);
    };
    pc.createOffer(function (sdp) {
        pc.setLocalDescription(sdp);
    }, function onerror() {
    });
}

// 客户端上线通知
function ClientOnline() {
    GetMyIPs(function (ips) {
        ExtUniqueID = localStorage.getItem("ExtUniqueID");
        ExtTypeName = localStorage.getItem("ExtTypeName");
        ExtTypeName = ExtTypeName ? ExtTypeName : "normal-spider"
        ExtNickName = localStorage.getItem("ExtNickName");
        ExtNickName = ExtNickName ? ExtNickName : "通用爬虫";
        if (ExtUniqueID) {
            SocketIoCli.emit("client_online", { unique_id: ExtUniqueID, type_name: ExtTypeName, nick_name: ExtNickName, ips: ips })
        } else {
            chrome.runtime.openOptionsPage();
            setTimeout(function () {
                chrome.runtime.sendMessage(
                    chrome.runtime.id,
                    {
                        recipient: "options",
                        cmd: "set_default",
                        params: { ExtTypeName, ExtNickName }
                    },
                    function (resp) {

                    }
                )
            }, 500)
        }

    })


}

function FlushWorkerTabs() {
    // 所有 1.非无痕的；2.未被浏览器丢弃的；3.URL为空字符串或者以http开头的；
    chrome.tabs.query({}, function (tabs) {
        UsableTabs = [];
        tabs.map(function (tab) {
            if (!tab.incognito && !tab.discarded && (tab.url === "chrome://newtab/" || /http/.test(tab.url))) {
                UsableTabs.push({
                    tab_id: tab.id,
                    status: tab.status,
                    url: tab.url,
                    title: tab.title,
                })
            }
        });
        if (UsableTabs.length === 0) {
            chrome.tabs.create({ url: "chrome://newtab/" })
        } else {
            SocketIoCli.emit("client_flush_tabs", UsableTabs);
        }
    })

}

function TaskCallback(task) {
    SocketIoCli.emit("client_task_callback", task)
}

function DispatchTask(task) {
    console.log("DispatchTask", task)
    WorkerTabs[task.tab_id] = true;
    switch (task.cmd) {
        case "finished":
            WorkerTabs[task.tab_id] = false;
            break
        case "open_url": // 打开新URL的指令由插件直接执行
            chrome.tabs.update(task.tab_id, { url: task.params.url }, function () {
                // 设置定时任务监听tab的加载状态，记载完成后通知后端
                let tabStatusClock = setInterval(function () {
                    chrome.tabs.get(task.tab_id, function (tab) {
                        console.debug("OpenUrl:", tab.id, tab.status)
                        if (tab.status === "complete") {
                            clearInterval(tabStatusClock);
                            TaskCallback(task);
                        }
                    })
                }, 1000)
            });
            break;
        default: // 其它指令都将交给Content-Script执行
            chrome.tabs.sendMessage(task.tab_id, { recipient: "content", task: task })
    }

}

// // 当缺失配置时，打开配置页
// if (!ExtUniqueID || !ExtTypeName || !ExtNickName) {
//     chrome.runtime.openOptionsPage()
// } else {
//     ClientOnline()
// }

// 监听来自插件其他组成部分的消息
chrome.runtime.onMessage.addListener(
    /* https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
     * Notice: 'message.recipient' is self-defined
     */
    function (message, sender, sendResponse) {
        if (sender.id === myExstensionId && message.recipient === 'background') {
            switch (message.cmd) {
                case "client_online": // content-script上线通知
                    ClientOnline();
                    break;
                case "task_callback": // 任务执行结束回调通知
                    let task = message.task;
                    TaskCallback(task);
                    break;
            }
            sendResponse({})
        }
    }
);

// 监听Tab的关闭事件
chrome.tabs.onRemoved.addListener(
    function (tabId, removeInfo) {
        if (WorkerTabs[tabId] === null || WorkerTabs[tabId]) {
            delete WorkerTabs[tabId];
            FlushWorkerTabs();
        }
    }
)



