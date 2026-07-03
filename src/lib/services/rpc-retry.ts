// Reintento de RPCs idempotentes (Fase 5.0, spec 29).
//
// Patron extraido de registerForEvent (Epic 25): una RPC con request_id
// idempotente puede reintentarse ante resultados AMBIGUOS (error de
// transporte, respuesta sin status real o 5xx) porque el reintento con el
// mismo request_id recupera el resultado ya commiteado. Un 4xx es definitivo
// y no se reintenta.

export type RpcResponse<T> = {
  data: T | null;
  error: { message: string } | null;
  status: number;
};

export type RpcRetryResult<T> =
  | { kind: "ok"; data: T | null }
  | { kind: "error" };

export const DEFAULT_RPC_ATTEMPTS = 3;

// Ambiguo = no sabemos si la transaccion commiteo: status 0 (sin respuesta
// real, supabase-js no lanza) o 5xx. Solo entonces vale la pena reintentar.
export function isAmbiguousRpcFailure(status: number): boolean {
  return status === 0 || status >= 500;
}

export async function callRpcWithRetry<T>(
  call: () => Promise<RpcResponse<T>>,
  {
    maxAttempts = DEFAULT_RPC_ATTEMPTS,
    onExhausted,
  }: {
    maxAttempts?: number;
    onExhausted?: (lastFailure: unknown) => void;
  } = {},
): Promise<RpcRetryResult<T>> {
  let lastFailure: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: RpcResponse<T>;

    try {
      response = await call();
    } catch (transportError) {
      // Transporte caido: ambiguo, reintentar.
      lastFailure = transportError;
      continue;
    }

    if (!response.error) {
      return { kind: "ok", data: response.data };
    }

    if (isAmbiguousRpcFailure(response.status)) {
      lastFailure = response.error;
      continue;
    }

    // Error definitivo (4xx): no reintentar.
    return { kind: "error" };
  }

  onExhausted?.(lastFailure);
  return { kind: "error" };
}
