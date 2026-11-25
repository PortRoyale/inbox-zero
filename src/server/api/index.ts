import { accountRoutes } from "@/server/api/account-routes";
import { createDispatcher } from "@/server/http";

export const routes = [...accountRoutes];

export const dispatch = createDispatcher(routes);
