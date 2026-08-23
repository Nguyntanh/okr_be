import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Đệ quy chuyển đổi tất cả các giá trị BigInt thành string trong đối tượng kết quả.
 */
function serializeBigInt(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInt(item));
  }

  if (typeof value === 'object') {
    const res: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      res[key] = serializeBigInt(val);
    }
    return res;
  }

  return value;
}

/**
 * Interceptor tự động chuyển đổi các trường BigInt trong Response thành String
 * giúp JSON.stringify không bị lỗi TypeError: Do not know how to serialize a BigInt.
 */
@Injectable()
export class TransformBigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeBigInt(data)));
  }
}
