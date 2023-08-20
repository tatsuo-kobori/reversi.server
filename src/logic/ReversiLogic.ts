import { BoardInfo } from "../types/BoardInfo";
import { Position } from "../types/Position";

export function searchBoard(boardInfo: BoardInfo, position: Position, direction: string, color: string, searchResult: Position[], simulate: boolean) {
	let searchPosition: Position = position;
	switch(direction) {
		case 'N':
			searchPosition.y--;
			break;
		case 'NE':
			searchPosition.y--;
			searchPosition.x++;
			break;
		case 'E':
			searchPosition.x++;
			break;
		case 'SE':
			searchPosition.y++;
			searchPosition.x++;
			break;
		case 'S':
			searchPosition.y++;
			break;
		case 'SW':
			searchPosition.y++;
			searchPosition.x--;
			break;
		case 'W':
			searchPosition.x--;
			break;
		case 'NW':
			searchPosition.y--;
			searchPosition.x--;
			break;
		default:
			break;
	}
	if (searchPosition.x < 0 || searchPosition.x > 7 || searchPosition.y < 0 || searchPosition.y > 7) {
		searchResult.splice(0);
		return;
	}
	else if (boardInfo.board[searchPosition.y][searchPosition.x] === '') {
		searchResult.splice(0);
		return;
	} else if ((boardInfo.board[searchPosition.y][searchPosition.x] === color) && searchResult.length > 0) {
		searchResult.forEach((resultPosition) => {
			if (!simulate) {
				boardInfo.board[resultPosition.y][resultPosition.x] = color;
			}
			//ひっくり返した位置をディープコピーして格納
			boardInfo.invertedPositions.push(JSON.parse(JSON.stringify(resultPosition)));
		});
		return;
	} else if (boardInfo.board[searchPosition.y][searchPosition.x] === (color === 'W' ? 'B' : 'W')) {
		searchResult.push(JSON.parse(JSON.stringify(position)));
		searchBoard(boardInfo, searchPosition, direction, color, searchResult, simulate);
		return;
	}
}

export function searchPlaceToPut(boardInfo: BoardInfo) {
	boardInfo.placesToPut.splice(0);
	for (let i=0; i < 8; i++) {
		for (let j=0; j < 8; j++) {
			if (boardInfo.board[i][j] === '') {
				const position: Position = {
					x: j,
					y: i,
				}
				const searchResult: Position[] = [];
				boardInfo.invertedPositions.splice(0);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'N', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'NE', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'E', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'SE', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'S', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'SW', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'W', boardInfo.nextTurn, searchResult, true);
				searchBoard(boardInfo, JSON.parse(JSON.stringify(position)), 'NW', boardInfo.nextTurn, searchResult, true);
				//ひっくり返る駒が存在する場合
				if (boardInfo.invertedPositions.length > 0) {
					//置ける位置としてディープコピーして置ける位置をリストに追加
					boardInfo.placesToPut.push(JSON.parse(JSON.stringify(position)));
				}
			}
		}
	}
}


	