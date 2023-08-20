import { Position } from "./Position";
export interface BoardInfo {
	board: string[][],
	invertedPositions: Position[],
	nextTurn: string,
	placesToPut: Position[],
}
