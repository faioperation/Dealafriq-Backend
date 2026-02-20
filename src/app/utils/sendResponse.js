export const sendResponse = (res, data) => {
  res.status(data.statusCode).json({
    message: data.message,
    success: data.success,
    statusCode: data.statusCode,
    meta: data.meta,
    data: data.data,
  });
};