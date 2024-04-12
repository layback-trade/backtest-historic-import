import { Entity } from '@/core/entity'

interface TeamProps {
  name: string
}

export class Team extends Entity<TeamProps> {
  constructor(props: TeamProps, id: number) {
    if (id <= 0) {
      throw new Error('Invalid team id')
    }
    super(props, String(id))
  }

  get name(): string {
    return this.props.name
  }
}
