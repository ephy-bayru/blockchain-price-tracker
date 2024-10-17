export interface CustomResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  meta?: {
    [key: string]: any;
  };
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  additionalInfo?: any;
}
