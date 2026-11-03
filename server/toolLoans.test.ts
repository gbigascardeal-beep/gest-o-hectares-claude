import { describe, expect, it } from "vitest";
import { isAssetEligibleForToolLoan, resolveToolCategoryIds } from "./toolLoansDb";

describe("Controle de empréstimos de ferramentas", () => {
  const categories = [
    { id: 1, name: "Ferramentas", parentId: null },
    { id: 2, name: "Furadeiras", parentId: 1 },
    { id: 3, name: "Sem fio", parentId: 2 },
    { id: 4, name: "Mobiliário", parentId: null },
  ];

  it("reconhece a categoria Ferramentas e todas as suas subcategorias", () => {
    const ids = resolveToolCategoryIds(categories);

    expect([...ids]).toEqual(expect.arrayContaining([1, 2, 3]));
    expect(ids.has(4)).toBe(false);
  });

  it("aceita uma ferramenta disponível para retirada", () => {
    const ids = resolveToolCategoryIds(categories);
    const eligible = isAssetEligibleForToolLoan(
      { categoryId: 1, subcategoryId: 2, status: "em_estoque" },
      ids,
      false,
    );

    expect(eligible).toBe(true);
  });

  it("impede nova retirada quando já existe empréstimo pendente", () => {
    const ids = resolveToolCategoryIds(categories);
    const eligible = isAssetEligibleForToolLoan(
      { categoryId: 1, subcategoryId: 2, status: "em_uso" },
      ids,
      true,
    );

    expect(eligible).toBe(false);
  });

  it.each(["baixado", "em_uso", "em_manutencao", "extraviado", "em_transferencia"])(
    "impede retirada quando a ferramenta está com status %s",
    status => {
      const ids = resolveToolCategoryIds(categories);
      expect(isAssetEligibleForToolLoan(
        { categoryId: 1, subcategoryId: null, status },
        ids,
        false,
      )).toBe(false);
    },
  );

  it("não disponibiliza patrimônio de outra categoria", () => {
    const ids = resolveToolCategoryIds(categories);
    expect(isAssetEligibleForToolLoan(
      { categoryId: 4, subcategoryId: null, status: "ativo" },
      ids,
      false,
    )).toBe(false);
  });
});
