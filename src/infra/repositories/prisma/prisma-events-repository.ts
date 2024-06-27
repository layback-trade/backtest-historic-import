import { EventsRepository } from '@/domain/market/application/repositories/events-repository'
import { prisma } from './client'

export class PrismaEventsRepository implements EventsRepository {
  async save() {}

  async findById() {
    return null
  }

  async countWithoutMarket() {
    const result = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*) as count FROM events
      WHERE EXISTS (
        SELECT 1 FROM markets
        WHERE markets."eventId" = events.id
      )
    `
    return Number(result[0].count)
  }

  async create() {}

  async count() {
    const count = await prisma.event.count()
    return count
  }
}
