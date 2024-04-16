import { Entity } from '@/core/entity'

interface TeamProps {
  name: string
}

export class Team extends Entity<TeamProps> {
  constructor(props: TeamProps, id: string) {
    super(props, String(id))
  }

  get name(): string {
    return this.props.name
  }

  set name(name: string) {
    this.props.name = name
  }
}
