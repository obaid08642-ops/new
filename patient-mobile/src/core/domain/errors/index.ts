export type ErrorType = 
  | 'DomainError'
  | 'ValidationError'
  | 'BusinessError'
  | 'InfrastructureError'
  | 'ApiError'
  | 'Unauthorized'
  | 'NotFound'
  | 'Conflict';

export class BaseError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;

  constructor(type: ErrorType, message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DomainError extends BaseError { constructor(msg: string) { super('DomainError', msg); } }
export class ValidationError extends BaseError { constructor(msg: string) { super('ValidationError', msg); } }
export class BusinessError extends BaseError { constructor(msg: string, code?: string) { super('BusinessError', msg, code); } }
export class InfrastructureError extends BaseError { constructor(msg: string) { super('InfrastructureError', msg); } }
export class ApiError extends BaseError { constructor(msg: string, code?: string) { super('ApiError', msg, code); } }
