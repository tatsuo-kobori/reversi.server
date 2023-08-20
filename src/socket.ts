import { Server, Socket } from "socket.io";
import { EntryUserInfo } from "./types/EntryUserInfo";
import { EntryUsersList } from "./types/EntryUsersList";
import { MoveInfo } from "./types/MoveInfo";
import { BoardInfo } from "./types/BoardInfo";
import { GameResult } from "./types/GameResult";
import { Players } from "./types/Players";
import {searchBoard, searchPlaceToPut} from "./logic/ReversiLogic";
import config = require("config");

// タイムアウト値
const timeout = config.get<number>("timeout");

function boardInit(board: string[][]): void {
	for (var i=0; i < 8; i++ ) {
		board[i] = new Array();
		for (var j=0; j < 8; j++ ) {
			if ((i == 3 && j == 3) || (i == 4 && j == 4)) board[i][j] = "W";
			else if ((i == 3 && j == 4) || (i == 4 && j == 3)) board[i][j] = "B";
			else board[i][j] = "";
		}
	}
}

function gameStart(boardInfo: BoardInfo, usersMap: Map<string, EntryUserInfo>) {
	boardInit(boardInfo.board);
	boardInfo.nextTurn = "B";
	boardInfo.invertedPositions = [];
	boardInfo.placesToPut = [];
}

function judgement(boardInfo: BoardInfo) {
	const boardInfoWork: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
	let blackCount = 0;
	let whiteCount = 0;
	boardInfoWork.board.forEach((line: string[]) => {
		whiteCount += line.filter(cellData => cellData === 'W').length;
		blackCount += line.filter(cellData => cellData === 'B').length;
	});
	boardInfoWork.nextTurn = "W";
	searchPlaceToPut(boardInfoWork);
	const placesToPutForWhite: number = boardInfoWork.placesToPut.length;
	boardInfoWork.nextTurn = "B";
	searchPlaceToPut(boardInfoWork);
	const placesToPutForBlack: number = boardInfoWork.placesToPut.length;
	if (((blackCount + whiteCount) == 64) ||
		(whiteCount === 0 || blackCount === 0) ||
		(placesToPutForWhite === 0 && placesToPutForBlack === 0)) {
		
		if (whiteCount > blackCount) {
			return "W";	//白の勝利
		}
		else if (blackCount > whiteCount) {
			return "B";	//黒の勝利
		}
		else {
			return "-";	//引分け
		}
	}
	return "";			//終了ではない
}

function userAdd(
	usersList: EntryUserInfo[],
	socketId: string,
	userInfo: EntryUserInfo) {
		userInfo.socketId = socketId;
		usersList.push(userInfo);
}

function userDelete(
	usersList: EntryUserInfo[],
	socketId: string ) {
	
	const temp: EntryUserInfo[] = usersList.filter((entry) => {
		entry.socketId === socketId
	});
	temp.forEach((entry) => {
		usersList.splice(usersList.indexOf(entry), 1);
	});
}

function createEntryList(usersMap: Map<string, EntryUserInfo>, players:Players): EntryUsersList {
	const entryList: EntryUsersList = {
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

function socket({io}: {io:Server}){
	io.disconnectSockets();
	
	const boardInfo: BoardInfo = {
		board: new Array(),
		nextTurn: "",
		invertedPositions: [],
		placesToPut: [],
	}
	const usersMap: Map<string, EntryUserInfo> = new Map<string, EntryUserInfo>();
	const players: Players = {
		whiteSeat: "",
		blackSeat: "",
	}
	
	gameStart(boardInfo, usersMap);
	
	io.on("connection", (socket: Socket) => {
		console.log(`User connected ${socket.id}`);
		
		const searchBoardInfo: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
		searchPlaceToPut(searchBoardInfo);
		boardInfo.placesToPut = searchBoardInfo.placesToPut;
		io.emit("moveInfo", JSON.stringify(boardInfo));
		
		const entryList = createEntryList(usersMap, players);
		io.emit("entryInfo", JSON.stringify(entryList));
		
		//ユーザがエントリーした際の電文処理
		socket.on("entry", (userInfoStr) => {
			console.log("entry");
			let userInfo: EntryUserInfo = JSON.parse(userInfoStr);
			
			userInfo.socketId = socket.id;
			usersMap.set(socket.id, userInfo);
			
			// エントリー受付を送信者へ返信
			socket.emit("entryAccept", JSON.stringify({
				status: "OK"
			}));
			
			// 更新されたユーザ情報を全員に配信
			const currentPlayers = JSON.parse(JSON.stringify(players));
			const entryList = createEntryList(usersMap, players);
			console.log(entryList);
			io.emit("entryInfo", JSON.stringify(entryList));
			if ((players.whiteSeat !== "" && players.blackSeat !== "") &&
				(currentPlayers.whiteSeat !== players.whiteSeat || currentPlayers.blackSeat !== players.blackSeat)) {
				
				gameStart(boardInfo, usersMap);
				const searchBoardInfo: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
				searchPlaceToPut(searchBoardInfo);
				boardInfo.placesToPut = searchBoardInfo.placesToPut;
				io.emit("moveInfo", JSON.stringify(boardInfo));
				io.to(players.whiteSeat).emit('gameStart', "W");
				io.to(players.blackSeat).emit('gameStart', "B");
			}
		});
		
		// ユーザが駒を置こうとした際の電文処理
		socket.on("move", (moveInfoStr: string) => {
			console.log("move:"+moveInfoStr);
			const moveInfo: MoveInfo = JSON.parse(moveInfoStr);
			if (boardInfo.placesToPut.filter(
				position => position.x === moveInfo.position.x && position.y === moveInfo.position.y).length === 0 ||
				boardInfo.nextTurn !== moveInfo.color) {
					//置けません
					return;
			}
			boardInfo.board[moveInfo.position.y][moveInfo.position.x] = moveInfo.color;
			// 判定ロジックの呼び出し
			const searchBoardInfo: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'N', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'NE', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'E', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'SE', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'S', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'SW', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'W', moveInfo.color, [], false);
			searchBoard(searchBoardInfo, JSON.parse(JSON.stringify(moveInfo.position)), 'NW', moveInfo.color, [], false);
			boardInfo.board = searchBoardInfo.board;
			//勝敗判定
			const judgementResult = judgement(boardInfo);
			console.log("JUDGE:"+judgementResult);
			if (judgementResult === "") {
				//置ける場所の割り出しロジック呼び出し
				boardInfo.nextTurn = boardInfo.nextTurn === "W" ? "B" : "W";
				searchPlaceToPut(boardInfo);
				boardInfo.invertedPositions = searchBoardInfo.invertedPositions;
				
				io.emit("moveInfo", JSON.stringify(boardInfo));
			} else {
				io.emit("moveInfo", JSON.stringify(boardInfo));
				io.emit("gameOver", judgementResult);				
			}
		});
		
		// ユーザがパスした際の電文処理
		socket.on("pass", () => {
			if (usersMap.get(socket.id)?.mode === boardInfo.nextTurn) {
				boardInfo.nextTurn = usersMap.get(socket.id)?.mode === 'W' ? 'B' : 'W';
				searchPlaceToPut(boardInfo);
				boardInfo.invertedPositions = [];
				
				io.emit("moveInfo", JSON.stringify(boardInfo));
			}
		});
		
		// ユーザが降参した際の電文処理
		socket.on("surrender", () => {
			const entry: EntryUserInfo = usersMap.get(socket.id) as EntryUserInfo;
			usersMap.delete(socket.id);
			usersMap.set(socket.id, entry);
			
			const entryList = createEntryList(usersMap, players);
			console.log(entryList);
			io.emit("entryInfo", JSON.stringify(entryList));
			if ((players.whiteSeat !== "" && players.blackSeat !== "")) {
				gameStart(boardInfo, usersMap);
				const searchBoardInfo: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
				searchPlaceToPut(searchBoardInfo);
				boardInfo.placesToPut = searchBoardInfo.placesToPut;
				io.emit("moveInfo", JSON.stringify(boardInfo));
				io.to(players.whiteSeat).emit('gameStart', 'W');
				io.to(players.blackSeat).emit('gameStart', 'B');
			}
		});
		
		// ユーザが退室した際の電文処理
		socket.on("exit", () => {
			usersMap.delete(socket.id);
			
			const currentPlayers = JSON.parse(JSON.stringify(players));
			const entryList = createEntryList(usersMap, players);
			console.log(entryList);
			io.emit("entryInfo", JSON.stringify(entryList));
			if ((players.whiteSeat !== "" && players.blackSeat !== "")) {
				gameStart(boardInfo, usersMap);
				const searchBoardInfo: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
				searchPlaceToPut(searchBoardInfo);
				boardInfo.placesToPut = searchBoardInfo.placesToPut;
				io.emit("moveInfo", JSON.stringify(boardInfo));
				io.to(players.whiteSeat).emit('gameStart', 'W');
				io.to(players.blackSeat).emit('gameStart', 'B');
			}
			
		});
		
		// 切断時の処理
		socket.on("disconnect", () => {
			console.log("disconnect:"+socket.id);
			
			usersMap.delete(socket.id);
			
			const currentPlayers = JSON.parse(JSON.stringify(players));
			const entryList = createEntryList(usersMap, players);
			console.log(entryList);
			io.emit("entryInfo", JSON.stringify(entryList));
			if ((players.whiteSeat !== "" && players.blackSeat !== "")) {
				gameStart(boardInfo, usersMap);
				const searchBoardInfo: BoardInfo = JSON.parse(JSON.stringify(boardInfo));
				searchPlaceToPut(searchBoardInfo);
				boardInfo.placesToPut = searchBoardInfo.placesToPut;
				io.emit("moveInfo", JSON.stringify(boardInfo));
				io.to(players.whiteSeat).emit('gameStart', 'W');
				io.to(players.blackSeat).emit('gameStart', 'B');
			}
		});
		
	});
}

export default socket;

