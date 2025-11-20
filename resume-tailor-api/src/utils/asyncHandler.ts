import type { NextFunction, Request, RequestHandler, Response } from 'express';

type Handler<P, ResBody, ReqBody, ReqQuery> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler = <
  P = Request['params'],
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Request['query']
>(
  handler: Handler<P, ResBody, ReqBody, ReqQuery>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next) => {
    Promise.resolve(handler(req as Request<P, ResBody, ReqBody, ReqQuery>, res as Response<ResBody>, next)).catch(next);
  };
};
