import { accountRoutes } from "@/server/api/account-routes";
import { productRoutes } from "@/server/api/product-routes";
import { createDispatcher } from "@/server/http";

export const routes = [...accountRoutes, ...productRoutes];

export const dispatch = createDispatcher(routes);
