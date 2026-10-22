import { describe, expect, it } from "vitest";
import { cellsAfterChange, fillFrom, pasteCells } from "../components-next/otp-screen";

const blank = ["", "", "", "", "", ""];
const six = ["1", "2", "3", "4", "5", "6"];

describe("OTP cells: typed digits", () => {
  it("one digit goes into its own cell", () => {
    expect(cellsAfterChange(blank, 2, "7")).toEqual(["", "", "7", "", "", ""]);
  });

  it("clearing a cell empties it", () => {
    expect(cellsAfterChange(["4", "", "", "", "", ""], 0, "")).toEqual(blank);
  });

  it("a digit typed over a filled cell replaces it, whatever the caret position", () => {
    expect(cellsAfterChange(["1", "", "", "", "", ""], 0, "12")).toEqual(["2", "", "", "", "", ""]);
    expect(cellsAfterChange(["1", "", "", "", "", ""], 0, "21")).toEqual(["2", "", "", "", "", ""]);
    expect(cellsAfterChange(["3", "", "", "", "", ""], 0, "37")).toEqual(["7", "", "", "", "", ""]);
  });

  it("a letter typed into a cell changes nothing", () => {
    expect(cellsAfterChange(blank, 1, "a")).toEqual(blank);
  });

  it("an autofill of six digits fills all six cells, into an empty or a filled first cell, and replacing an edge digit", () => {
    expect(cellsAfterChange(blank, 0, "123456")).toEqual(six);
    expect(cellsAfterChange(["1", "", "", "", "", ""], 0, "1123456")).toEqual(six);
    expect(cellsAfterChange(["1", "", "", "", "", ""], 0, "123456")).toEqual(six);
    expect(cellsAfterChange(["6", "", "", "", "", ""], 0, "123456")).toEqual(six);
  });

  it("Eastern Arabic-Indic digits are read as digits", () => {
    expect(cellsAfterChange(blank, 0, "٤")).toEqual(["4", "", "", "", "", ""]);
  });
});

describe("OTP cells: paste", () => {
  it("a six-digit code pastes into all six cells from any cell", () => {
    expect(pasteCells(blank, 3, "123456")).toEqual(six);
  });

  it("the code is the last six-digit run, not another number in the message", () => {
    expect(pasteCells(blank, 0, "Order 182045 - your code is 482913")).toEqual(["4", "8", "2", "9", "1", "3"]);
    expect(pasteCells(blank, 0, "Ref 2024: 482913")).toEqual(["4", "8", "2", "9", "1", "3"]);
  });

  it("a spaced or dashed code pastes its six digits", () => {
    expect(pasteCells(blank, 3, "123 456")).toEqual(six);
    expect(pasteCells(blank, 0, "123-456")).toEqual(six);
  });

  it("Eastern Arabic-Indic digits paste as the code", () => {
    expect(pasteCells(blank, 0, "٤٨٢٩١٣")).toEqual(["4", "8", "2", "9", "1", "3"]);
  });

  it("fewer than six digits fill from the cell the paste lands in", () => {
    expect(pasteCells(blank, 3, "98")).toEqual(["", "", "", "9", "8", ""]);
    expect(fillFrom(blank, 4, "987")).toEqual(["", "", "", "", "9", "8"]);
  });
});
