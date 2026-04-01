import { createApiClient } from "../api-factory";
import { getPosHost } from "../auth";

export const posApi = createApiClient({
  baseURL: () => {
    const host = getPosHost();
    return host ? `${host}/api/pos/v1` : "";
  },
});
