export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
    readonly statusCode = 502,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(message: string) { super(message, 'provider_not_configured', false, 503); }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(message: string) { super(message, 'provider_auth_failed', false, 502); }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message: string, retryAfterSeconds?: number) { super(message, 'provider_rate_limited', true, 429, retryAfterSeconds); }
}

export class ProviderTemporaryError extends ProviderError {
  constructor(message: string) { super(message, 'provider_temporary_failure', true, 503); }
}

export class ProviderSchemaError extends ProviderError {
  constructor(message: string) { super(message, 'provider_schema_changed', false, 502); }
}
