import { describe, expect, it, vi } from "vitest";

import {
  callRpcWithRetry,
  isAmbiguousRpcFailure,
  type RpcResponse,
} from "@/lib/services/rpc-retry";

function ok<T>(data: T): RpcResponse<T> {
  return { data, error: null, status: 200 };
}

function failure(status: number): RpcResponse<never> {
  return { data: null, error: { message: `status ${status}` }, status };
}

describe("isAmbiguousRpcFailure", () => {
  it("status 0 y 5xx son ambiguos; 4xx es definitivo", () => {
    expect(isAmbiguousRpcFailure(0)).toBe(true);
    expect(isAmbiguousRpcFailure(500)).toBe(true);
    expect(isAmbiguousRpcFailure(503)).toBe(true);
    expect(isAmbiguousRpcFailure(400)).toBe(false);
    expect(isAmbiguousRpcFailure(404)).toBe(false);
  });
});

describe("callRpcWithRetry", () => {
  it("devuelve el dato al primer exito", async () => {
    const call = vi.fn().mockResolvedValue(ok("dato"));

    const result = await callRpcWithRetry(call);

    expect(result).toEqual({ kind: "ok", data: "dato" });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("reintenta ante errores de transporte y recupera el exito", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new Error("red caida"))
      .mockResolvedValueOnce(ok("recuperado"));

    const result = await callRpcWithRetry(call);

    expect(result).toEqual({ kind: "ok", data: "recuperado" });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("reintenta ante 5xx pero NO ante 4xx (definitivo)", async () => {
    const retried = vi
      .fn()
      .mockResolvedValueOnce(failure(503))
      .mockResolvedValueOnce(ok("segunda"));

    expect(await callRpcWithRetry(retried)).toEqual({
      kind: "ok",
      data: "segunda",
    });
    expect(retried).toHaveBeenCalledTimes(2);

    const definitive = vi.fn().mockResolvedValue(failure(400));

    expect(await callRpcWithRetry(definitive)).toEqual({ kind: "error" });
    expect(definitive).toHaveBeenCalledTimes(1);
  });

  it("agota los intentos y reporta el ultimo fallo", async () => {
    const call = vi.fn().mockResolvedValue(failure(500));
    const onExhausted = vi.fn();

    const result = await callRpcWithRetry(call, {
      maxAttempts: 3,
      onExhausted,
    });

    expect(result).toEqual({ kind: "error" });
    expect(call).toHaveBeenCalledTimes(3);
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });
});
