import { Entity } from '@/core/entity'
import { Country } from './country'

interface CompetitionProps {
  name: string
  cc?: Country
}

export class Competition extends Entity<CompetitionProps> {
  constructor(props: CompetitionProps, id: string) {
    super(props, id)
  }

  get name(): string {
    return this.props.name
  }

  get cc(): string | undefined {
    return this.props.cc?.code
  }
}
