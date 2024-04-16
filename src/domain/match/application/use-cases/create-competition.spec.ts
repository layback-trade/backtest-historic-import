import { InMemoryCompetitionsRepository } from '@/infra/cache/repositories/in-memory-competitions-repository'
import { CreateCompetitionUseCase } from './create-competition'

let sut: CreateCompetitionUseCase
let inMemoryCompetitionRepository: InMemoryCompetitionsRepository

describe('Create competition', async () => {
  beforeEach(() => {
    inMemoryCompetitionRepository = new InMemoryCompetitionsRepository()
    sut = new CreateCompetitionUseCase(inMemoryCompetitionRepository)
  })

  it('should be able to create a competition', async () => {
    await sut.execute({
      id: '1',
      name: 'Champions League',
      cc: 'en',
    })

    expect(inMemoryCompetitionRepository.competitions.get('1')).toEqual(
      expect.objectContaining({
        name: 'Champions League',
        cc: 'en',
      }),
    )
  })

  it('should not be able to add a competition that already exists', async () => {
    inMemoryCompetitionRepository.competitions.set('1', {
      name: 'Champions League',
      cc: 'en',
    })

    expect(() =>
      sut.execute({
        id: '1',
        name: 'Champions League',
        cc: 'en',
      }),
    ).rejects.toThrowError('Competition already exists')
  })
})
