// The analytics API does not use Nest validation, serialization, microservices, or websockets.
// Fail explicitly if a future Worker path starts importing one of these optional modules.
throw new Error('UNSUPPORTED_NEST_OPTIONAL_MODULE');
