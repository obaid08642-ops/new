export interface RequestDTO<T = any> {
  payload: T;
  requestId?: string;
  timestamp?: number;
}

export interface ResponseDTO<T = any> {
  data?: T;
  success: boolean;
  message?: string;
  errorCode?: string;
  timestamp: number;
}

export interface ValidationDTO {
  isValid: boolean;
  errors?: Record<string, string[]>;
}

export interface SharedDTO {
  version: string;
}
