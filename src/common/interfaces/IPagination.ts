import { FindManyOptions } from 'typeorm';
import { IBaseEntity } from './IBaseEntity';

export interface SortOption<T> {
  field: Extract<keyof T, string>;
  order: 'ASC' | 'DESC';
}

export interface PaginationOptions<T extends IBaseEntity> {
  options?: FindManyOptions<T>;
  page?: number;
  limit?: number;
  sort?: SortOption<T>[];
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
