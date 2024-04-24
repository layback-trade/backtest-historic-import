import { CreateCompetitionUseCase } from '@/domain/match/application/use-cases/create-competition'
import { CreateMatchUseCase } from '@/domain/match/application/use-cases/create-match'
import { CreateTeamUseCase } from '@/domain/match/application/use-cases/create-team'
import { EndMatchFirstHalfUseCase } from '@/domain/match/application/use-cases/end-match-first-half'
import { EndMatchSecondHalfUseCase } from '@/domain/match/application/use-cases/end-match-second-half'
import { RegisterNewMatchStatisticUseCase } from '@/domain/match/application/use-cases/register-new-match-statistic'
import { StartMatchSecondHalfUseCase } from '@/domain/match/application/use-cases/start-match-second-half'
import { dataSavingQueueName, queueInstances } from '@/infra'
import { BetsAPIMatchVendor } from '@/infra/match-vendor/betsapi-match-vendor'
import {
  eventsToSave,
  inMemoryCompetitionsRepository,
  inMemoryMatchesRepository,
  inMemoryTeamsRepository,
} from '@/infra/publish'
import { isAfter, isBefore } from 'date-fns'

interface MarketResourceHandlerProps {
  data: {
    eventsIdBatch: string[]
  }
}

const createCompetitionUseCase = new CreateCompetitionUseCase(
  inMemoryCompetitionsRepository,
)
const createTeamUseCase = new CreateTeamUseCase(inMemoryTeamsRepository)
const createMatchUseCase = new CreateMatchUseCase(inMemoryMatchesRepository)
const registerNewMatchStatisticUseCase = new RegisterNewMatchStatisticUseCase(
  inMemoryMatchesRepository,
)
const endMatchFirstHalfUseCase = new EndMatchFirstHalfUseCase(
  inMemoryMatchesRepository,
)
const startMatchSecondHalfUseCase = new StartMatchSecondHalfUseCase(
  inMemoryMatchesRepository,
)
const endMatchSecondHalfUseCase = new EndMatchSecondHalfUseCase(
  inMemoryMatchesRepository,
)
const matchVendor = new BetsAPIMatchVendor()
export async function matchResourcesHandler({
  data,
}: MarketResourceHandlerProps) {
  // if(data.eventsIdBatch.length === 0) {
  //   throw new Error('No events to fetch')
  // }
  // if(data.eventsIdBatch.length > 10) {
  //   throw new Error('Too many events to fetch')
  // }

  // Verify if the events exist in the repository

  // call the external service to fetch the events
  const matches = await matchVendor.fetchMatches(data.eventsIdBatch)

  for (const match of matches) {
    await Promise.all([
      createCompetitionUseCase.execute(match.competition),
      createTeamUseCase.execute(match.homeTeam),
      createTeamUseCase.execute(match.awayTeam),
    ])

    await createMatchUseCase.execute({
      awayTeamId: match.awayTeam.id,
      competitionId: match.competition.id,
      homeTeamId: match.homeTeam.id,
      id: match.id,
      firstHalfStart: match.firstHalfStart,
    })

    for (const statistic of match.statistics.filter((stat) =>
      isBefore(stat.timestamp, match.firstHalfEnd),
    )) {
      await registerNewMatchStatisticUseCase.execute({
        matchId: match.id,
        teamSide: statistic.teamSide,
        timestamp: statistic.timestamp,
        type: statistic.type,
        value: statistic.value,
      })
    }

    await endMatchFirstHalfUseCase.execute({
      id: match.id,
      timestamp: match.firstHalfEnd,
    })
    await startMatchSecondHalfUseCase.execute({
      id: match.id,
      timestamp: match.secondHalfStart,
    })

    for (const statistic of match.statistics.filter((stat) =>
      isAfter(stat.timestamp, match.firstHalfEnd),
    )) {
      await registerNewMatchStatisticUseCase.execute({
        matchId: match.id,
        teamSide: statistic.teamSide,
        timestamp: statistic.timestamp,
        type: statistic.type,
        value: statistic.value,
      })
    }
    if (match.secondHalfEnd) {
      await endMatchSecondHalfUseCase.execute({
        id: match.id,
        timestamp: match.secondHalfEnd,
      })
    }
  }

  data.eventsIdBatch.forEach((eventId) => {
    eventsToSave.add(eventId)
  })

  if (eventsToSave.size >= 20 || data.eventsIdBatch.length < 10) {
    // or it's the last event task to save
    queueInstances.get(dataSavingQueueName)?.add('DATA-SAVING', null, {
      removeOnComplete: false,
      removeOnFail: false,
    })
    eventsToSave.clear()
  }
}
