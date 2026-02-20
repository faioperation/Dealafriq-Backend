/* eslint-disable @typescript-eslint/no-explicit-any */


export const catchAsync =
  (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      next(err);
    });
  };