import { randomUUID } from 'crypto'

export class Entity<Props> {
  protected _id: string

  protected constructor(
    protected props: Props,
    id?: string,
  ) {
    this._id = id ?? randomUUID()
  }

  public get id(): string {
    return this._id
  }

  /* v8 ignore next 7 */
  public equals(object?: Entity<Props>): boolean {
    if (object === null || object === undefined) {
      return false
    }

    return this.id === object.id
  }
}
