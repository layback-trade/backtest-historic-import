import { ImportsRepository } from '@/domain/import/application/repositories/imports-repository'
import { Import } from '@/domain/import/enterprise/entities/import'
import { Period } from '@/domain/import/enterprise/entities/value-objects/period'
import { prisma } from './client'

export class PrismaImportsRepository implements ImportsRepository {
  async findById(id: string) {
    const importFound = await prisma.import.findUnique({
      where: {
        id,
        startDate: {
          not: null,
        },
        endDate: {
          not: null,
        },
      },
    })

    if (!importFound) {
      return null
    }

    const importEntity = new Import(
      {
        period: new Period(importFound.startDate!, importFound.endDate!),
        createdAt: importFound.createdAt,
        status: importFound.status,
        endedAt: importFound.endedAt ?? undefined,
        eventsAdded: importFound.eventsAdded || undefined,
        totalEvents: importFound.totalEvents || undefined,
        totalEventsWithMarket: importFound.totalEventsWithMarket || undefined,
      },
      importFound.id,
    )

    return importEntity
  }

  async save(importEntity: Import) {
    await prisma.import.update({
      where: {
        id: importEntity.id,
      },
      data: {
        startDate: importEntity.period.startDate,
        endDate: importEntity.period.endDate,
        status: importEntity.status,
        endedAt: importEntity.endedAt,
        eventsAdded: importEntity.eventsAdded,
        totalEvents: importEntity.totalEvents,
        totalEventsWithMarket: importEntity.totalEventsWithMarket,
        createdAt: importEntity.createdAt,
      },
    })
  }

  async create(importEntity: Import) {
    await prisma.import.create({
      data: {
        id: importEntity.id,
        startDate: importEntity.period.startDate,
        endDate: importEntity.period.endDate,
        status: importEntity.status,
        endedAt: importEntity.endedAt,
        eventsAdded: importEntity.eventsAdded,
        totalEvents: importEntity.totalEvents,
        totalEventsWithMarket: importEntity.totalEventsWithMarket,
        createdAt: importEntity.createdAt,
      },
    })
  }

  async findMany() {
    const imports = await prisma.import.findMany({
      where: {
        startDate: {
          not: null,
        },
        endDate: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return imports.map((importFound) => {
      return new Import(
        {
          period: new Period(importFound.startDate!, importFound.endDate!),
          createdAt: importFound.createdAt,
          status: importFound.status,
          endedAt: importFound.endedAt ?? undefined,
          eventsAdded: importFound.eventsAdded || undefined,
          totalEvents: importFound.totalEvents || undefined,
          totalEventsWithMarket: importFound.totalEventsWithMarket || undefined,
        },
        importFound.id,
      )
    })
  }

  async delete(id: string) {
    await prisma.import.delete({
      where: {
        id,
      },
    })
  }
}
