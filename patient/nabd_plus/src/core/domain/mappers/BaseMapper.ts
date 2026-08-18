/**
 * Generic Base Mapper Interface
 */
export interface IMapper<TEntity, TDto, TApi> {
  toDomain(apiModel: TApi): TEntity;
  toDTO(entity: TEntity): TDto;
  toAPI(dto: TDto): TApi;
}

export abstract class BaseMapper<TEntity, TDto, TApi> implements IMapper<TEntity, TDto, TApi> {
  abstract toDomain(apiModel: TApi): TEntity;
  abstract toDTO(entity: TEntity): TDto;
  abstract toAPI(dto: TDto): TApi;
  
  public toDomainArray(apiModels: TApi[]): TEntity[] {
    return apiModels.map(a => this.toDomain(a));
  }
  
  public toDTOArray(entities: TEntity[]): TDto[] {
    return entities.map(e => this.toDTO(e));
  }
}
