import { Vector3 } from "three";

export function zeroVec()       { return new Vector3( 0,  0,  0); }
export function oneVec()        { return new Vector3( 1,  1,  1); }
export function upVec()         { return new Vector3( 0,  1,  0); }
export function downVec()       { return new Vector3( 0, -1,  0); }
export function rightVec()      { return new Vector3( 1,  0,  0); }
export function leftVec()       { return new Vector3(-1,  0,  0); }
export function backwardsVec()  { return new Vector3( 0,  0,  1); }
export function forwardsVec()   { return new Vector3( 0,  0, -1); }
