// value object?
export class Country {
  public readonly code: string
  constructor(code: string) {
    if (code.length !== 2) {
      throw new Error('Invalid Country Code')
    }

    this.code = code
  }
}
