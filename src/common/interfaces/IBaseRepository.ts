import {
  FindOneOptions,
  FindManyOptions,
  SaveOptions,
  UpdateResult,
  DeleteResult,
  FindOptionsWhere,
  DeepPartial,
  EntityManager,
} from 'typeorm';
import { PaginationOptions, PaginationResult } from './IPagination';
import { IBaseEntity } from './IBaseEntity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * Represents a base repository interface.
 * @template T - The entity type.
 */
export interface IBaseRepository<T extends IBaseEntity> {
  /**
   * Find a single entity by id or options.
   * @param idOrOptions - The entity id or find options.
   */
  findOne(idOrOptions: string | FindOneOptions<T>): Promise<T | null>;

  /**
   * Find multiple entities with pagination.
   * @param paginationOptions - The pagination and find options.
   */
  findAll(
    paginationOptions: PaginationOptions<T>,
  ): Promise<PaginationResult<T>>;

  /**
   * Create a new entity.
   * @param entity - The entity data to create.
   * @param options - Save options.
   */
  create(entity: DeepPartial<T>, options?: SaveOptions): Promise<T>;

  /**
   * Update an existing entity.
   * @param criteria - The criteria to find the entity to update.
   * @param partialEntity - The partial entity data to update.
   */
  update(
    criteria: string | FindOptionsWhere<T>,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<UpdateResult>;

  /**
   * Delete an entity.
   * @param criteria - The criteria to find the entity to delete.
   */
  delete(criteria: string | FindOptionsWhere<T>): Promise<DeleteResult>;

  /**
   * Count entities based on given options.
   * @param options - The find options to apply.
   */
  count(options?: FindManyOptions<T>): Promise<number>;

  /**
   * Check if an entity exists based on given criteria.
   * @param criteria - The criteria to check for existence.
   */
  exists(criteria: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Search for entities with pagination and advanced options.
   * @param paginationOptions - The pagination and search options.
   */
  search(paginationOptions: PaginationOptions<T>): Promise<PaginationResult<T>>;

  /**
   * Execute operations within a transaction.
   * @param operation - The operation to execute within the transaction.
   */
  transaction<R>(
    operation: (transactionManager: EntityManager) => Promise<R>,
  ): Promise<R>;
}
