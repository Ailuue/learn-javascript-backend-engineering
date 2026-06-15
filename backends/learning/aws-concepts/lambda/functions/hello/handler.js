// Node Lambda handler. Runtime nodejs20.x, configured handler "handler.handler".
exports.handler = async (event) => {
  const name = event.name ?? "world";
  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello, ${name}!` }),
  };
};
