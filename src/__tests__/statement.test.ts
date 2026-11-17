import { statementFilename, statementYear } from "../lib/statement";

describe("annual statement file", () => {
  it("keeps a plain suggested name and replaces anything else", () => {
    expect(statementFilename("pugbuild-earnings-2026-carlos-souza.pdf", 2026)).toBe(
      "pugbuild-earnings-2026-carlos-souza.pdf",
    );
    expect(statementFilename(null, 2026)).toBe("pugbuild-earnings-2026.pdf");
    expect(statementFilename("../../Documents/x.pdf", 2026)).toBe("pugbuild-earnings-2026.pdf");
    expect(statementFilename("a/b.pdf", 2026)).toBe("pugbuild-earnings-2026.pdf");
    expect(statementFilename("statement.exe", 2026)).toBe("pugbuild-earnings-2026.pdf");
    expect(statementFilename("Extrato 2026.pdf", 2026)).toBe("pugbuild-earnings-2026.pdf");
  });

  it("reads the year only from a four-digit pager value", () => {
    expect(statementYear("2026")).toBe(2026);
    expect(statementYear("2026-11")).toBeNull();
    expect(statementYear(undefined)).toBeNull();
    expect(statementYear("all")).toBeNull();
  });
});
