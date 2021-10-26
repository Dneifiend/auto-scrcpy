var exec = require('child_process').exec;
var cmd = require('node-cmd');

console.log('auto scrcpy start')
console.log('------------')

var app = {
    "ids": [],
    "details": []
}

function init() {
    app.ids = getId()
    refreshDetail()
}
init()


function getId() {
    var devices = cmd.runSync(`adb devices -l`)
    if (devices.err) {
        throw devices.err
    }
    return devices.data.split("\r\n").filter((e, i) => e.length && i > 0).map(e => e.match(/^.+?(?=\s+)/)[0])
}


function idChangeEventListnner() {
    setInterval(() => {
        var ids = getId()
        ids.forEach(id => {
            idChangeEventHandler(id)
        })
        app.ids = ids
    }, 1000);
}
idChangeEventListnner()

function idChangeEventHandler(id) {
    app.ids.push(id)
    refreshDetail()
}


function refreshDetail() {
    try {
        var ids = getId()
        var change = false
        app.details = ids.map(async id => {
            var nickName = await getNickName(id)
            var osVersion = "AOS " + cmd.runSync(`adb -s ${id} shell getprop ro.build.version.release`).data.trim()
            if (!findScrcpyWindow().includes(scrcpyWindowTitle(nickName, osVersion))) {
                openScrcpy(id, nickName, osVersion)
                change = true
            }
            else {

            }
            return { "id": id, "nickname": nickName, "os": osVersion }
        })

        if (change) {
            console.log('Finded New Device!')
            console.log(app.details)
        }
    }
    catch {
        refreshDetail()
    }
}

function getNickName(id) {
    return new Promise((res, rej) => {
        exec(`adb -s ${id} shell dumpsys bluetooth_manager`, (err, stdout, stderr) => {
            try {

                res(stdout.match(/(?<=\s+name:).+/)[0].trim())
            }
            catch {

            }
        })
    })
}



function scrcpyWindowTitle(nickname, osVersion) {
    return `${nickname} (${osVersion})`
}

function openScrcpy(id, nickname, osVersion) {
    cmd.run(`scrcpy -s ${id} --window-title "${scrcpyWindowTitle(nickname, osVersion)}"`)
}


function findScrcpyWindow() {
    var cmdData = cmd.runSync(`tasklist /fi "imagename eq scrcpy.exe" /fo csv /v`).data.trim()
    return cmdData.split("\r\n").map(e => e.split(",")).reduce((p, c, i) => {
        if (i === 0) {
            return p
        }
        else {
            p.push(c[c.length - 1].match(/(?<=^\").+(?=\"$)/)[0])
            return p
        }
    }, [])
}



