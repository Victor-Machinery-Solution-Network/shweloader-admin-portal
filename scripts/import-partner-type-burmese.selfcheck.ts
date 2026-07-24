import assert from "node:assert";
import { splitPartnerName } from "./import-partner-type-burmese";
assert.deepStrictEqual(
  splitPartnerName("Commercial Truck Dealer (လုပ်ငန်းသုံးကားရောင်းချသူ)"),
  { name: "Commercial Truck Dealer", nameMy: "လုပ်ငန်းသုံးကားရောင်းချသူ" });
assert.deepStrictEqual(splitPartnerName("Dealer"), { name: "Dealer", nameMy: null });
assert.deepStrictEqual(splitPartnerName("Dealer (Yangon)"), { name: "Dealer (Yangon)", nameMy: null }); // non-Burmese paren untouched
assert.deepStrictEqual(splitPartnerName("Rental (ငှား) (မြန်မာ)").nameMy, "မြန်မာ"); // last Burmese paren
console.log("splitPartnerName self-check passed");
