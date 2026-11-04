import { ruleTester } from "../rule-tester.ts";
import { noRenderProp } from "./no-render-prop.ts";

ruleTester.run("no-render-prop", noRenderProp, {
  valid: [
    "interface RowProps { renderCell: (cell: Cell) => Node } function Row({ renderCell }: RowProps) { return cells.map((cell) => renderCell(cell)); }",
    "interface ListProps { renderItem: (item: Item) => Node } function List({ renderItem }: ListProps) { for (const item of items) out.push(renderItem(item)); }",
    "interface ListProps { renderItem: (item: Item) => Node } function List({ renderItem }: ListProps) { items.forEach(function (item) { renderItem(item); }); }",
    "interface ListProps { renderItem: (item: Item) => Node } function List({ renderItem }: ListProps) { let i = 0; while (i < n) { renderItem(items[i]); i++; } }",
    "interface Options { renderHeader: () => Node }",
    "interface CardProps { header: Node; onRender: () => void; renderer: Renderer }",
    "type CardProps = { renderHeader: () => Node };",
  ],
  invalid: [
    {
      code: "interface CardProps { renderHeader: () => Node } function Card({ renderHeader }: CardProps) { return renderHeader(); }",
      errors: [{ messageId: "escapeHatch", data: { name: "renderHeader" } }],
    },
    {
      code: "interface CardProps { renderFooter?: () => Node }",
      errors: [{ messageId: "escapeHatch", data: { name: "renderFooter" } }],
    },
    {
      code: "interface RowProps { renderCell: (cell: Cell) => Node } function Row({ renderCell }: RowProps) { return cells[computeIndex()].map; renderCell(cells[0]); }",
      errors: [{ messageId: "escapeHatch", data: { name: "renderCell" } }],
    },
    {
      code: "interface RowProps { renderCell: (cell: Cell) => Node } function Row({ renderCell }: RowProps) { return cells.map(renderCell); }",
      errors: [{ messageId: "escapeHatch", data: { name: "renderCell" } }],
    },
    {
      code: 'interface RowProps { renderCell: (cell: Cell) => Node } function Row({ renderCell }: RowProps) { return cells["map"]((cell) => renderCell(cell)); }',
      errors: [{ messageId: "escapeHatch", data: { name: "renderCell" } }],
    },
    {
      code: "interface PanelProps { renderTitle: () => Node; renderBody: () => Node } function Panel({ renderTitle, renderBody }: PanelProps) { return [1].map(() => renderBody()); }",
      errors: [{ messageId: "escapeHatch", data: { name: "renderTitle" } }],
    },
  ],
});
