import { cents } from "../../shared/money";
export type Transfer = { kind: "transfer"; amount: number };
export type Expense = { kind: "expense"; amount: number };
export type Entry = Transfer | Expense;
export interface Posting {
  amount: number;
  describe(): string;
}
export interface Clock {
  now(): number;
}
export type EntryInput = { amount: number };
export const centsOf = (posting: Posting) => cents(posting.amount);
