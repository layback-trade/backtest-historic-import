import { MatchesRepository } from '@/domain/match/application/repositories/matches-repository'
import { prisma } from './client'

export class PrismaMatchesRepository implements MatchesRepository {
  async save() {}

  async findById() {
    return null
  }

  async create() {}

  async count() {
    const count = await prisma.match.count()
    return count
  }
}
