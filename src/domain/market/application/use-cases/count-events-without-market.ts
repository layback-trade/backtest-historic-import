export class CountEventsWithoutMarket {
  constructor(private eventsRepository: EventsRepository) {}

  async execute() {
    return await this.eventsRepository.countEventsWithoutMarket()
  }
}
