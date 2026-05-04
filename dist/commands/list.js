import { formatMemoList } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { ok } from "./types.js";
export async function runListCommand(context, options) {
    const items = await context.readClient.list(options.limit);
    if (options.json) {
        return ok(formatJson({
            ok: true,
            items,
            scope: {
                source: "recent_notes",
                complete: false,
                description: "Results are limited to the recent memo batch returned by flomo Web."
            }
        }));
    }
    return ok(formatMemoList(items));
}
