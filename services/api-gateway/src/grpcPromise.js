function grpcCall(client, method, payload) {
  return new Promise((resolve, reject) => {
    client[method](payload, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
}

module.exports = grpcCall;
