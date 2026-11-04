export class Book {
  amount = 0;
  *[Symbol.iterator]() {
    yield this.amount;
  }
}
