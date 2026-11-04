import { ruleTester } from "../rule-tester.ts";
import { noFlashlistEmptyComponent } from "./no-flashlist-empty-component.ts";

ruleTester.run("no-flashlist-empty-component", noFlashlistEmptyComponent, {
  valid: ["<FlashList data={rows} renderItem={render} />"],
  invalid: [
    {
      code: "<FlashList data={rows} ListEmptyComponent={Empty} />",
      errors: [{ messageId: "banned" }],
    },
  ],
});
