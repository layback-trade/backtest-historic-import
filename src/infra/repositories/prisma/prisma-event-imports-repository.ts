import { EventImportsRepository } from '@/domain/import/application/repositories/event-imports-repository'
import { EventImport } from '@/domain/import/enterprise/entities/event-import'
import { prisma } from './client'

export class PrismaEventImportsRepository implements EventImportsRepository {
  async findById(id: string) {
    const importFound = await prisma.import.findUnique({
      where: {
        id,
        specificEventId: {
          not: null,
        },
      },
    })

    if (!importFound) {
      return null
    }

    const eventImport = new EventImport(
      {
        eventId: importFound.specificEventId!,
        createdAt: importFound.createdAt,
        status: importFound.status,
        endedAt: importFound.endedAt ?? undefined,
        eventsAdded: importFound.eventsAdded || undefined,
        totalEvents: importFound.totalEvents || undefined,
        totalEventsWithMarket: importFound.totalEventsWithMarket || undefined,
      },
      importFound.id,
    )

    return eventImport
  }

  async save(eventImport: EventImport) {
    await prisma.import.update({
      where: {
        id: eventImport.id,
      },
      data: {
        specificEventId: eventImport.eventId,
        status: eventImport.status,
        endedAt: eventImport.endedAt,
        eventsAdded: eventImport.eventsAdded,
        totalEvents: eventImport.totalEvents,
        totalEventsWithMarket: eventImport.totalEventsWithMarket,
        createdAt: eventImport.createdAt,
      },
    })
  }

  async create(eventImport: EventImport) {
    await prisma.import.create({
      data: {
        id: eventImport.id,
        specificEventId: eventImport.eventId,
        status: eventImport.status,
        endedAt: eventImport.endedAt,
        eventsAdded: eventImport.eventsAdded,
        totalEvents: eventImport.totalEvents,
        totalEventsWithMarket: eventImport.totalEventsWithMarket,
        createdAt: eventImport.createdAt,
      },
    })
  }

  async findMany() {
    const eventImports = await prisma.import.findMany({
      where: {
        specificEventId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return eventImports.map((importFound) => {
      return new EventImport(
        {
          eventId: importFound.specificEventId!,
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
}
