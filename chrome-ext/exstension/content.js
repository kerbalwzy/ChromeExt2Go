console.log("[Debug] Content-Script loaded!");
const WaitEleTimes = 30
const WaitEleInterval = 1000

// 等待某个元素加载完成, 再执行任务
function _waitEleDom(selector, times, interval) {
    StepDoing = true
    // selector: JS选择器
    // times: 重试次数
    // interval: 重试间隔
    let _times = times || -1,
        _interval = interval || 500,
        _selector = selector,
        _iIntervalID // 定时器ID

    return new Promise(function (resolve, reject) {
        _iIntervalID = setInterval(function () {
            if (!_times) {
                clearInterval(_iIntervalID)
                reject(new Error('元素获取超时'))
            }
            _times <= 0 || _times-- //如果是正数就 --
            let _eleDom = document.querySelector(_selector)
            if (_eleDom !== null) {
                clearInterval(_iIntervalID)
                resolve(_eleDom)
            }
        }, _interval)
    })
}

function waitEleDom(selector) {
    return _waitEleDom(selector, WaitEleTimes, WaitEleInterval)
}

function waitAnyEleDom(selectorArray, times, interval) {
    /**
     *@desc 等待任意个元素中的某个元素加载完成
     *@param {array} selectorArray JS选择器列表
     *@param {int} times 重试次数
     *@param {int} interval 重试时间间隔 
     */
    StepDoing = true
    let _times = times || -1,
        _interval = interval || 500,
        _iIntervalID // 定时器ID

    return new Promise(function (resolve, reject) {
        _iIntervalID = setInterval(function () {
            if (!_times) {
                clearInterval(_iIntervalID)
                reject(new Error('元素获取超时'))
            }
            _times <= 0 || _times-- //如果是正数就 --
            for (let i = 0; i < selectorArray.length; i++) {
                let _selector = selectorArray[i]
                let _eleDom = document.querySelector(_selector)
                if (_eleDom !== null) {
                    clearInterval(_iIntervalID)
                    resolve(_eleDom)
                    return
                }
            }

        }, _interval)
    })
}

function eleDomDispatchEvent(eleDom, eventName) {
    // eleDom: 元素DOM对象
    // eventName: 事件名称
    let _ev = document.createEvent('HTMLEvents')
    _ev.initEvent(eventName, true, true)
    eleDom.dispatchEvent(_ev)
}

function sleep(time) {
    // time: 睡眠时间, 毫秒(ms)
    var startTime = new Date().getTime() + parseInt(time, 10);
    while (new Date().getTime() < startTime) { }
}

// 同步发送XHR请求，请求体与响应体数据都为JSON格式 
function sync_xhr_json(method, url, data) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));
    return JSON.parse(xhr.responseText);
}



// https://developer.chrome.com/docs/extensions/reference/runtime/#property-id 
var myExstensionId = chrome.runtime.id;

// https://developer.chrome.com/docs/extensions/reference/runtime/#method-sendMessage
function sendMsg2Background(msg, callback) {
    /*
    @params msg {object} 消息数据对象,要求可以被JSON序列化为字典
    @params callback {function} 回调函数，接受一个响应体数据作为参数
     */
    // 添加接收者名称
    msg.recipient = "background";
    chrome.runtime.sendMessage(
        myExstensionId,
        msg,
        function (resp) {
            callback ? callback(resp) : null
        }
    )
}

/* https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
 * Notice: 'message.recipient' is self-defined
 */
chrome.runtime.onMessage.addListener(
    async function (message, sender, sendResponse) {
        if (sender.id === myExstensionId && message.recipient === 'content') {
            let task = message.task;
            try {
                dispatchTask(task)
            } catch (error) {
                task.exec_error = error.toString()
                sendTaskCallback(task)
            }

        }
    }
);

function dispatchTask(task) {
    switch (task.cmd) {
        case "ele_text":
            getEleText(task);
            break;
        case "ele_click":
            clickEle(task);
            break;
        case "ele_s_click":
            clickEles(task);
            break
        case "ele_screen_shot":
            getEleScreenShot(task);
            break;
        case "ele_change":
            changeEleValue(task);
            break;
        case "ele_s_attr":
            getElesAttr(task);
            break
        case "xhr":
            sendXhr(task);
            break
        case "scroll_end":
            scrollToEnd(task);
            break
        default:
            let err = "Unknow cmd: " + task.cmd + ", Content-Script can not hanled"
            console.debug(err)
            task.exec_error = err
            sendTaskCallback(task)
    }
}

function sendTaskCallback(task) {
    console.log(task)
    sendMsg2Background({ cmd: "task_callback", task: task })
}

// 获取指定元素的文本内容, 并发送到background
async function getEleText(task) {
    await waitEleDom(task.params.selector).then(function (elemDom) {
        task.callback_params = elemDom.innerText
    }).catch(function () {
        task.error = "获取元素失败， 元素未找到:" + task.params.selector
    })
    sendTaskCallback(task)
}

// 点击指定的元素标签
async function clickEle(task) {
    await waitEleDom(task.params.selector).then(function (elemDom) {
        elemDom.click();
        sleep(500);
    }).catch(function () {
        task.error = "获取元素失败， 元素未找到:" + task.params.selector
    })
    sendTaskCallback(task)
}

async function clickEles(task) {
    let elems = document.querySelectorAll(task.params.selector);
    for (let i = 0; i < elems.length; i++) {
        let eleDom = elems[i]
        eleDomDispatchEvent(eleDom, "click")
    }
    sendTaskCallback(task)
}

async function changeEleValue(task) {
    await waitEleDom(task.params.selector).then(function (elemDom) {
        if (elemDom.value != task.params.value) {
            elemDom.value = task.params.value;
            eleDomDispatchEvent(elemDom, "change")
        }
    }).catch(function () {
        task.error = "获取元素失败， 元素未找到:" + task.params.selector
    })
    sendTaskCallback(task)
}

async function getElesAttr(task) {
    let elems = document.querySelectorAll(task.params.selector);
    let data = [];
    for (let index = 0; index < elems.length; index++) {
        let item = elems[index];
        let attr_value = item.getAttribute(task.params.attr_name)
        attr_value = attr_value ? attr_value : item[task.params.attr_name]
        data.push(attr_value)
    }
    task.callback_params = data;
    sendTaskCallback(task)
}

// 获取指定元素的截图数据(base64字符串)， 并发送background，
async function getEleScreenShot(task) {
    await waitEleDom(task.params.selector).then(async function (eleDom) {
        await html2canvas(eleDom, { allowTaint: true, useCORS: true }).then(async function (canvas) {
            task.callback_params = canvas.toDataURL("image/png");
            if (task.callback_params.indexOf("image/png;base64") < 0 || task.callback_params.length <
                50) {
                task.error = "生成的图片BS64字符串错误! "
            }
        }).catch(async function (err) {
            task.error = "HTML标签转换图片错误！" + err
        })
    }).catch(function (err) {
        task.error = "获取元素失败， 元素未找到:" + task.params.selector
    })

    sendTaskCallback(task)
}

async function sendXhr(task) {
    let xhr = new XMLHttpRequest()
    let url = window.location.origin + task.params.path;
    if (task.params.query) {
        url += "?" + task.params.query;
    }
    xhr.open(task.params.method, url)
    // 设置请求头
    if (task.params.headers) {
        for (let key in task.params.headers) {
            xhr.setRequestHeader(key, task.params.headers[key])
        }
    }
    // 设置完成回调
    xhr.onreadystatechange = function () {
        // In local files, status is 0 upon success in Mozilla Firefox
        if (xhr.readyState === XMLHttpRequest.DONE) {
            let status = xhr.status;
            if (status === 0 || (status >= 200 && status < 400)) {
                // The request has been completed successfully
                task.callback_params = xhr.responseText
            } else {
                // Oh no! There has been an error with the request!
                task.error = xhr.responseText + "\n" + xhr.status
            }
            sendTaskCallback(task)
        }
    };

    // 发送请求
    xhr.send(task.params.body || null)
}

function scrollToEnd(task) {//滚动到底部
    var h = $(document).height() - $(window).height();
    $(document).scrollTop(h);
    sendTaskCallback(task)
}

