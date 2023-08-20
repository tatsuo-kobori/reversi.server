"use strict";
exports.__esModule = true;
var ReversiLogic_1 = require("./logic/ReversiLogic");
var config = require("config");
// タイムアウト値
var timeout = config.get("timeout");
function boardInit(board) {
    for (var i = 0; i < 8; i++) {
        board[i] = new Array();
        for (var j = 0; j < 8; j++) {
            if ((i == 3 && j == 3) || (i == 4 && j == 4))
                board[i][j] = "W";
            else if ((i == 3 && j == 4) || (i == 4 && j == 3))
                board[i][j] = "B";
            else
                board[i][j] = "";
        }
    }
}
function gameStart(boardInfo, usersMap) {
    boardInit(boardInfo.board);
    boardInfo.nextTurn = "B";
    boardInfo.invertedPositions = [];
    boardInfo.placesToPut = [];
}
function judgement(boardInfo) {
    var boardInfoWork = JSON.parse(JSON.stringify(boardInfo));
    var blackCount = 0;
    var whiteCount = 0;
    boardInfoWork.board.forEach(function (line) {
        whiteCount += line.filter(function (cellData) { return cellData === 'W'; }).length;
        blackCount += line.filter(function (cellData) { return cellData === 'B'; }).length;
    });
    boardInfoWork.nextTurn = "W";
    (0, ReversiLogic_1.searchPlaceToPut)(boardInfoWork);
    var placesToPutForWhite = boardInfoWork.placesToPut.length;
    boardInfoWork.nextTurn = "B";
    (0, ReversiLogic_1.searchPlaceToPut)(boardInfoWork);
    var placesToPutForBlack = boardInfoWork.placesToPut.length;
    if (((blackCount + whiteCount) == 64) ||
        (whiteCount === 0 || blackCount === 0) ||
        (placesToPutForWhite === 0 && placesToPutForBlack === 0)) {
        if (whiteCount > blackCount) {
            return "W"; //白の勝利
        }
        else if (blackCount > whiteCount) {
            return "B"; //黒の勝利
        }
        else {
            return "-"; //引分け
        }
    }
    return ""; //終了ではない
}
function userAdd(usersList, socketId, userInfo) {
    userInfo.socketId = socketId;
    usersList.push(userInfo);
}
function userDelete(usersList, socketId) {
    var temp = usersList.filter(function (entry) {
        entry.socketId === socketId;
    });
    temp.forEach(function (entry) {
        usersList.splice(usersList.indexOf(entry), 1);
    });
}
function createEntryList(usersMap, players) {
    var entryList = {
        users: []
    };
    players.whiteSeat = "";
    players.blackSeat = "";
    usersMap.forEach(function (entry) {
        if (entryList.users.length === 0) {
            entry.mode = "W";
            players.whiteSeat = entry.socketId;
        }
        else if (entryList.users.length === 1) {
            entry.mode = "B";
            players.blackSeat = entry.socketId;
        }
        else {
            entry.mode = "E";
        }
        entryList.users.push(entry);
    });
    return entryList;
}
function socket(_a) {
    var io = _a.io;
    io.disconnectSockets();
    var boardInfo = {
        board: new Array(),
        nextTurn: "",
        invertedPositions: [],
        placesToPut: []
    };
    var usersMap = new Map();
    var players = {
        whiteSeat: "",
        blackSeat: ""
    };
    gameStart(boardInfo, usersMap);
    io.on("connection", function (socket) {
        console.log("User connected ".concat(socket.id));
        var searchBoardInfo = JSON.parse(JSON.stringify(boardInfo));
        (0, ReversiLogic_1.searchPlaceToPut)(searchBoardInfo);
        boardInfo.placesToPut = searchBoardInfo.placesToPut;
        io.emit("moveInfo", JSON.stringify(boardInfo));
        var entryList = createEntryList(usersMap, players);
        io.emit("entryInfo", JSON.stringify(entryList));
        //ユーザがエントリーした際の電文処理
        socket.on("entry", function (userInfoStr) {
            console.log("entry");
            var userInfo = JSON.parse(userInfoStr);
            userInfo.socketId = socket.id;
            usersMap.set(socket.id, userInfo);
            // エントリー受付を送信者へ返信
            socket.emit("entryAccept", JSON.stringify({
                status: "OK"
            }));
            // 更新されたユーザ情報を全員に配信
            var currentPlayers = JSON.parse(JSON.stringify(players));
            var entryList = createEntryList(usersMap, players);
            console.log(entryList);
            io.emit("entryInfo", JSON.stringify(entryList));
            if ((players.whiteSeat !== "" && players.blackSeat !== "") &&
                (currentPlayers.whiteSeat !== players.whiteSeat || currentPlayers.blackSeat !== players.blackSeat)) {
                gameStart(boardInfo, usersMap);
                var searchBoardInfo_1 = JSON.parse(JSON.stringify(boardInfo));
                (0, ReversiLogic_1.searchPlaceToPut)(searchBoardInfo_1);
                boardInfo.placesToPut = searchBoardInfo_1.placesToPut;
                io.emit("moveInfo", JSON.stringify(boardInfo));
                io.to(players.whiteSeat).emit('gameStart', "W");
                io.to(players.blackSeat).emit('gameStart', "B");
            }
        });
        // ユーザが駒を置こうとした際の電文処理
        socket.on("move", function (moveInfoStr) {
            console.log("move:" + moveInfoStr);
            var moveInfo = JSON.parse(moveInfoStr);
            if (boardInfo.placesToPut.filter(function (position) { return position.x === moveInfo.position.x && position.y === moveInfo.position.y; }).length === 0 ||
                boardInfo.nextTurn !== moveInfo.color) {
                //置けません
                return;
            }
            boardInfo.board[moveInfo.position.y][moveInfo.position.x] = moveInfo.color;
            // 判定ロジックの呼び出し
            var searchBoardInfo = JSON.parse(JSON.stringify(boardInfo));
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'N', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'NE', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'E', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'SE', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'S', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'SW', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'W', moveInfo.color, [], false);
            (0, ReversiLogic_1.searchBoard)(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'NW', moveInfo.color, [], false);
            boardInfo.board = searchBoardInfo.board;
            //勝敗判定
            var judgementResult = judgement(boardInfo);
            console.log("JUDGE:" + judgementResult);
            if (judgementResult === "") {
                //置ける場所の割り出しロジック呼び出し
                boardInfo.nextTurn = boardInfo.nextTurn === "W" ? "B" : "W";
                (0, ReversiLogic_1.searchPlaceToPut)(boardInfo);
                boardInfo.invertedPositions = searchBoardInfo.invertedPositions;
                io.emit("moveInfo", JSON.stringify(boardInfo));
            }
            else {
                io.emit("moveInfo", JSON.stringify(boardInfo));
                io.emit("gameOver", judgementResult);
            }
        });
        // ユーザがパスした際の電文処理
        socket.on("pass", function () {
            var _a, _b;
            if (((_a = usersMap.get(socket.id)) === null || _a === void 0 ? void 0 : _a.mode) === boardInfo.nextTurn) {
                boardInfo.nextTurn = ((_b = usersMap.get(socket.id)) === null || _b === void 0 ? void 0 : _b.mode) === 'W' ? 'B' : 'W';
                (0, ReversiLogic_1.searchPlaceToPut)(boardInfo);
                boardInfo.invertedPositions = [];
                io.emit("moveInfo", JSON.stringify(boardInfo));
            }
        });
        // ユーザが降参した際の電文処理
        socket.on("surrender", function () {
            var entry = usersMap.get(socket.id);
            usersMap["delete"](socket.id);
            usersMap.set(socket.id, entry);
            var entryList = createEntryList(usersMap, players);
            console.log(entryList);
            io.emit("entryInfo", JSON.stringify(entryList));
            if ((players.whiteSeat !== "" && players.blackSeat !== "")) {
                gameStart(boardInfo, usersMap);
                var searchBoardInfo_2 = JSON.parse(JSON.stringify(boardInfo));
                (0, ReversiLogic_1.searchPlaceToPut)(searchBoardInfo_2);
                boardInfo.placesToPut = searchBoardInfo_2.placesToPut;
                io.emit("moveInfo", JSON.stringify(boardInfo));
                io.to(players.whiteSeat).emit('gameStart', 'W');
                io.to(players.blackSeat).emit('gameStart', 'B');
            }
        });
        // ユーザが退室した際の電文処理
        socket.on("exit", function () {
            usersMap["delete"](socket.id);
            var currentPlayers = JSON.parse(JSON.stringify(players));
            var entryList = createEntryList(usersMap, players);
            console.log(entryList);
            io.emit("entryInfo", JSON.stringify(entryList));
            if ((players.whiteSeat !== "" && players.blackSeat !== "")) {
                gameStart(boardInfo, usersMap);
                var searchBoardInfo_3 = JSON.parse(JSON.stringify(boardInfo));
                (0, ReversiLogic_1.searchPlaceToPut)(searchBoardInfo_3);
                boardInfo.placesToPut = searchBoardInfo_3.placesToPut;
                io.emit("moveInfo", JSON.stringify(boardInfo));
                io.to(players.whiteSeat).emit('gameStart', 'W');
                io.to(players.blackSeat).emit('gameStart', 'B');
            }
        });
        // 切断時の処理
        socket.on("disconnect", function () {
            console.log("disconnect:" + socket.id);
            usersMap["delete"](socket.id);
            var currentPlayers = JSON.parse(JSON.stringify(players));
            var entryList = createEntryList(usersMap, players);
            console.log(entryList);
            io.emit("entryInfo", JSON.stringify(entryList));
            if ((players.whiteSeat !== "" && players.blackSeat !== "")) {
                gameStart(boardInfo, usersMap);
                var searchBoardInfo_4 = JSON.parse(JSON.stringify(boardInfo));
                (0, ReversiLogic_1.searchPlaceToPut)(searchBoardInfo_4);
                boardInfo.placesToPut = searchBoardInfo_4.placesToPut;
                io.emit("moveInfo", JSON.stringify(boardInfo));
                io.to(players.whiteSeat).emit('gameStart', 'W');
                io.to(players.blackSeat).emit('gameStart', 'B');
            }
        });
    });
}
exports["default"] = socket;
