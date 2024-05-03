import { UpdateTeamNameUseCase } from '@/domain/match/application/use-cases/update-team-name'
import { publisher } from '@/infra/start'

import { differenceInMinutes } from 'date-fns'

interface DataUnificationHandlerProps {
  eventId: string
}

const updateTeamNameUseCase = new UpdateTeamNameUseCase(
  publisher.inMemoryTeamsRepository,
)

export async function dataUnificationHandler({
  eventId,
}: DataUnificationHandlerProps) {
  const event = await publisher.inMemoryEventsRepository.findById(eventId)
  const match = await publisher.inMemoryMatchesRepository.findById(eventId)

  if (!event || !match) {
    throw new Error('Event and match already exist')
  }

  /* Define and VERIFY other periods time and if needed the game time,
   * Second half end -> Match_odds closedAt -> Last statistic staledAt.
   * First half end -> HALF_TIME closedAt
   * Suspend odds based on statistics (goal)
   * Fill odd gaps if needed
   *
   * Change teams name to betfair?
   * Team side inversion
   * Red flags
   */

  // if (
  //   this.props.type === 'HALF_TIME' &&
  //   addMinutes(this.props.inPlayDate, 44) > time
  // ) {
  //   console.log(
  //     'Mercado não pode ser fechado antes de 45 minutos',
  //     this.props.status,
  //   )
  //   // throw new Error('Market cannot be closed before 45 minutes')
  // }

  // const matchOddsMarket = event.getMarketByType('MATCH_ODDS')

  // const matchHomeTeam = inMemoryTeamsRepository.findById(match.homeTeamId)
  // const eventHomeTeam = matchOddsMarket.selections[0]
  // const eventAwayTeam = matchOddsMarket.selections[1]

  // await updateTeamNameUseCase.execute({
  //   id:
  // })

  // const allOdds = [] // or in the saving step get from inMemory?

  // event.markets.forEach((market) => {
  //   const odds = market.odds.map((odd, index) => {
  //     return {
  //       ...odd,
  //       staledAt: market.odds[index + 1].timestamp
  //     }
  //   })
  // })

  // match.homeTeamId =

  /* RED FLAGS
   * Market without Odds Live -> Flag
   * Market without Odds Pre Live -> Flag
   * Match with first half start much later than scheduled -> Warn
   * Match without statistics -> Flag
   * Event with more than 13 markets -> Impossible
   * Event with less than 13 markets
   */

  if (
    differenceInMinutes(match.firstHalfStart, event.scheduledStartDate) > 15
  ) {
    // warn
  }
}
