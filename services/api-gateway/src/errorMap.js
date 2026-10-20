const grpc = require('@grpc/grpc-js');

function grpcToHttp(error) {
  const map = {
    [grpc.status.INVALID_ARGUMENT]: 400,
    [grpc.status.UNAUTHENTICATED]: 401,
    [grpc.status.PERMISSION_DENIED]: 403,
    [grpc.status.NOT_FOUND]: 404,
    [grpc.status.ALREADY_EXISTS]: 409,
    [grpc.status.ABORTED]: 409,
    [grpc.status.RESOURCE_EXHAUSTED]: 409,
    [grpc.status.UNAVAILABLE]: 503
  };
  return { status: map[error.code] || 500, message: error.details || error.message || 'Internal server error' };
}

module.exports = grpcToHttp;
