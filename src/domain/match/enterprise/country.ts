// value object?
export class Country {
  public readonly code: string
  constructor(code: string) {
    // v8 ignore next 3
    if (code.length !== 2) {
      throw new Error('Invalid Country Code')
    }

    this.code = code
  }
}
