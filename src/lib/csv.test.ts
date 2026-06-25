import { describe, expect, it } from "vitest";

import { escapeCsvValue, neutralizeSpreadsheetFormula } from "./csv";

describe("neutralizeSpreadsheetFormula", () => {
  it("antepone comilla simple a valores que abren con caracter de formula", () => {
    expect(neutralizeSpreadsheetFormula("=1+1")).toBe("'=1+1");
    expect(neutralizeSpreadsheetFormula("+48")).toBe("'+48");
    expect(neutralizeSpreadsheetFormula("-2")).toBe("'-2");
    expect(neutralizeSpreadsheetFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeSpreadsheetFormula("\tcmd")).toBe("'\tcmd");
  });

  it("deja intactos los valores normales", () => {
    expect(neutralizeSpreadsheetFormula("Juan Perez")).toBe("Juan Perez");
    expect(neutralizeSpreadsheetFormula("a=b")).toBe("a=b");
    expect(neutralizeSpreadsheetFormula("")).toBe("");
  });
});

describe("escapeCsvValue", () => {
  it("neutraliza formulas antes de escapar", () => {
    expect(escapeCsvValue("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  });

  it("envuelve en comillas y duplica comillas internas", () => {
    expect(escapeCsvValue('dice "hola"')).toBe('"dice ""hola"""');
  });

  it("envuelve valores con comas o saltos de linea", () => {
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue("linea1\nlinea2")).toBe('"linea1\nlinea2"');
  });

  it("convierte null/undefined en string vacio", () => {
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("una formula con coma se neutraliza y se envuelve", () => {
    expect(escapeCsvValue("=1,2")).toBe("\"'=1,2\"");
  });
});
