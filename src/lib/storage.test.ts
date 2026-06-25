import { describe, expect, it } from "vitest";

import { selectStaleFilePaths } from "./storage";

describe("selectStaleFilePaths", () => {
  it("devuelve las rutas completas de todos los archivos menos el conservado", () => {
    const result = selectStaleFilePaths(
      "profiles/abc",
      ["1-old.jpg", "2-old.png", "3-new.webp"],
      "3-new.webp",
    );

    expect(result).toEqual([
      "profiles/abc/1-old.jpg",
      "profiles/abc/2-old.png",
    ]);
  });

  it("devuelve vacio cuando solo esta el archivo conservado", () => {
    expect(
      selectStaleFilePaths("events/e1", ["only-new.jpg"], "only-new.jpg"),
    ).toEqual([]);
  });

  it("devuelve vacio cuando la carpeta esta vacia", () => {
    expect(selectStaleFilePaths("events/e1", [], "new.jpg")).toEqual([]);
  });

  it("borra todo si el archivo a conservar no esta en la lista", () => {
    expect(
      selectStaleFilePaths("profiles/x", ["a.jpg", "b.jpg"], "c.jpg"),
    ).toEqual(["profiles/x/a.jpg", "profiles/x/b.jpg"]);
  });
});
