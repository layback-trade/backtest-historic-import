import { Entity } from '@/core/entity'
import { Country } from './country'

interface CompetitionProps {
  name: string
  cc: Country
}

export class Competition extends Entity<CompetitionProps> {
  get name(): string {
    return this.props.name
  }

  get cc(): string {
    return this.props.cc.code
  }
}
