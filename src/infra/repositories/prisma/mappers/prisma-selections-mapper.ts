import { SelectionOdd as PrismaOdd } from '@prisma/client'

interface PrismaSelectionMapperInput {
  selection: {
    id: string
    name: string
  }
  odds: PrismaOdd[]
  marketId: string
}

export class PrismaSelectionMapper {
  static toPersistence({
    odds,
    selection,
    marketId,
  }: PrismaSelectionMapperInput) {
    const lastOddBeforeInPlay = odds
      .filter((odd) => {
        return (
          odd.selectionId === Number(selection.id) && odd.gameTimePeriod === 0
        )
      })
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime())
      .pop()

      if(!lastOddBeforeInPlay) {
        console.log('Sem odd antes do in play', {selection, marketId})
      }

    return {
      id: Number(selection.id),
      hasInPlay: null,
      hasAlert: null,
      name: selection.name,
      odd: lastOddBeforeInPlay?.odd ?? 9999,
      marketId,
    }
  }
}
